const PaymentTransaction = require('../../models/PaymentTransaction');
const Invoice = require('../../models/Invoice');
const Subscription = require('../../models/Subscription');
const UpgradeIntent = require('../../models/UpgradeIntent');
const { runCriticalGovernanceAction } = require('../platformAuditOutboxService');
const { enqueueBillingNotifications } = require('./billingNotificationService');
const { markInvoicePaid, rejectInvoice } = require('./invoiceService');
const {
    activateSubscription,
    emitDeferredSubscriptionEvent,
    markPendingApproval,
    returnToTrialOrPastDueAfterRejection
} = require('./subscriptionService');

const amountInPaisa = value => {
    if (!['number', 'string'].includes(typeof value) || value === null || value === '' || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) <= 0 || !Number.isSafeInteger(Math.round(Number(value) * 100)) || Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) > 0.00001) throw new Error('Payment amount must be positive with at most two decimals.');
    return Math.round(Number(value) * 100);
};
const getActorId = (req) => req?.user?.accountId || req?.user?.account_id || req?.user?._id || null;

const submitManualPayment = async ({
    shopId,
    invoiceId,
    provider,
    amount,
    transactionId = '',
    senderNumber = '',
    screenshotUrl = '',
    req = null
}) => {
    if (!['manual_bkash', 'manual_nagad', 'manual_bank', 'other'].includes(provider)) throw new Error('Invalid payment provider.');
    transactionId = String(transactionId || '').trim();
    if (!transactionId || transactionId.length > 120) throw new Error('Transaction reference is required (maximum 120 characters).');
    const paid = amountInPaisa(amount);
    const result = await runCriticalGovernanceAction({
        mutate: async session => {
            const invoice = await Invoice.findOne({ _id: invoiceId, shopId }).session(session);
            if (!invoice) throw new Error('Invoice not found');
            if (paid !== amountInPaisa(invoice.amount)) throw new Error('Payment amount must match the invoice exactly.');
            // Serialize all invoice/payment changes for this subscription.
            const subscription = await Subscription.findOneAndUpdate({ _id: invoice.subscriptionId, shopId }, { $inc: { billingRevision: 1 } }, { new: true, session });
            if (!subscription) throw new Error('Subscription not found');
            const existing = await PaymentTransaction.findOne({ provider, transactionId }).session(session);
            if (existing) {
                if (String(existing.shopId) !== String(shopId) || String(existing.invoiceId) !== String(invoiceId) || amountInPaisa(existing.amount) !== paid) throw new Error('This transaction reference is already in use.');
                return { payment: existing, replay: true };
            }
            if (!['unpaid', 'rejected'].includes(invoice.status)) throw new Error('Only unpaid or rejected invoices can accept payment.');
            if (invoice.dueDate && invoice.dueDate < new Date()) throw new Error('Invoice has expired. Create a new invoice.');
            if (await PaymentTransaction.exists({ shopId, status: 'pending' }).session(session)) throw new Error('A payment is already awaiting review. Wait for its result before submitting another.');
            const [payment] = await PaymentTransaction.create([{
                shopId, invoiceId, planId: invoice.planId, planName: invoice.planName, planSlug: invoice.planSlug,
                provider, amount: paid / 100, transactionId, senderNumber, screenshotUrl, status: 'pending', submittedBy: getActorId(req)
            }], { session });
            invoice.status = 'submitted'; invoice.currentPaymentId = payment._id;
            await invoice.save({ session });
            await markPendingApproval({ subscription, planId: invoice.planId, planName: invoice.planName, planSlug: invoice.planSlug,
                billingCycle: invoice.billingCycle, invoiceId: invoice._id, req, session, deferEvents: true });
            await enqueueBillingNotifications({ payment, event: 'submitted', session });
            return { payment, subscription, replay: false };
        },
        audit: ({ payment }) => ({ req, action: 'billing.payment_submitted', entityType: 'PaymentTransaction', entityId: payment._id,
            shop_id: shopId, message: 'Manual payment submitted for Super Admin approval', metadata: { invoiceId, provider, amount: payment.amount } })
    });
    if (result.replay) return result.payment;
    const payment = result.payment;
    try { await emitDeferredSubscriptionEvent(result.subscription); }
    catch (error) { console.error('Billing subscription event failed:', error.name); }
    return payment;
};

const verifyManualPayment = async ({ paymentId, req = null, adminNote = '' }) => {
    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (['approved', 'verified'].includes(payment.status)) {
        if (invoice.status === 'paid' && (!invoice.currentPaymentId || String(invoice.currentPaymentId) === String(payment._id))) {
            return payment;
        }
    }

    if (payment.status !== 'pending') {
        const error = new Error(`Payment cannot be approved while it is ${payment.status}.`);
        error.code = 'PAYMENT_INVALID_STATE';
        error.statusCode = 409;
        throw error;
    }

    const verifiedAt = new Date();
    const result = await runCriticalGovernanceAction({
        mutate: async (session) => {
            const currentPayment = await PaymentTransaction.findOne({
                _id: payment._id,
                status: 'pending',
                __v: payment.__v
            }).session(session);
            if (!currentPayment) {
                const conflict = new Error('Another reviewer changed this payment. Reload and try again.');
                conflict.code = 'PAYMENT_REVIEW_CONFLICT';
                conflict.statusCode = 409;
                throw conflict;
            }

            const currentInvoice = await Invoice.findById(currentPayment.invoiceId).session(session);
            if (!currentInvoice || String(currentInvoice.shopId) !== String(currentPayment.shopId) || amountInPaisa(currentPayment.amount) !== amountInPaisa(currentInvoice.amount)) throw new Error('Payment does not match the invoice amount or shop.');
            if (currentInvoice.currentPaymentId && String(currentInvoice.currentPaymentId) !== String(currentPayment._id)) throw new Error('This is not the current payment attempt.');
            if (currentInvoice.status !== 'submitted') throw new Error('Invoice is not awaiting approval.');
            currentPayment.status = 'approved';
            currentPayment.verifiedBy = getActorId(req);
            currentPayment.verifiedAt = verifiedAt;
            currentPayment.adminNote = adminNote || currentPayment.adminNote;
            currentPayment.rejectionReason = '';
            await currentPayment.save({ session });

            const paidInvoice = await markInvoicePaid(invoice._id, {
                notes: adminNote,
                paidAt: verifiedAt,
                session
            });
            const subscription = await activateSubscription({
                subscriptionId: paidInvoice.subscriptionId,
                planId: paidInvoice.planId || paidInvoice.planSlug || paidInvoice.planName,
                billingCycle: paidInvoice.billingCycle,
                invoiceId: paidInvoice._id,
                req,
                now: verifiedAt,
                session,
                skipAudit: true,
                deferEvents: true
            });
            if (subscription.$locals.purchasedPeriod) {
                paidInvoice.servicePeriodStart = subscription.$locals.purchasedPeriod.start;
                paidInvoice.servicePeriodEnd = subscription.$locals.purchasedPeriod.end;
                await paidInvoice.save({ session });
            }
            if (paidInvoice.upgradeIntentId) {
                await UpgradeIntent.updateOne(
                    {
                        _id: paidInvoice.upgradeIntentId,
                        shopId: currentPayment.shopId,
                        status: 'active'
                    },
                    {
                        $set: {
                            status: 'completed',
                            completedAt: verifiedAt
                        }
                    },
                    { session }
                );
            }
            await enqueueBillingNotifications({ payment: currentPayment, event: 'approved', session });
            return { payment: currentPayment, invoice: paidInvoice, subscription };
        },
        audit: ({ payment: approvedPayment, invoice: paidInvoice }) => ({
            req,
            action: 'billing.payment_verified',
            entityType: 'PaymentTransaction',
            entityId: approvedPayment._id,
            shop_id: approvedPayment.shopId,
            message: 'Manual payment approved by platform billing reviewer',
            metadata: {
                invoiceId: paidInvoice._id,
                provider: approvedPayment.provider,
                amount: approvedPayment.amount
            }
        })
    });
    try { if (result.subscription) await emitDeferredSubscriptionEvent(result.subscription); }
    catch (error) { console.error('Billing subscription event failed:', error.name); }

    return result.payment;
};

const rejectManualPayment = async ({ paymentId, rejectionReason, req = null, adminNote = '' }) => {
    if (!rejectionReason || !String(rejectionReason).trim()) {
        throw new Error('Rejection reason is required');
    }

    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (['approved', 'verified'].includes(payment.status)) throw new Error('Approved payments cannot be rejected');
    if (payment.status === 'rejected') {
        const rejectedInvoice = await Invoice.findById(payment.invoiceId);
        if (rejectedInvoice?.status === 'rejected') return payment;
    }
    if (payment.status !== 'pending') {
        const error = new Error(`Payment cannot be rejected while it is ${payment.status}.`);
        error.code = 'PAYMENT_INVALID_STATE';
        error.statusCode = 409;
        throw error;
    }

    const safeReason = String(rejectionReason).trim();
    const rejectedAt = new Date();
    const result = await runCriticalGovernanceAction({
        mutate: async (session) => {
            const currentPayment = await PaymentTransaction.findOne({
                _id: payment._id,
                status: 'pending',
                __v: payment.__v
            }).session(session);
            if (!currentPayment) {
                const conflict = new Error('Another reviewer changed this payment. Reload and try again.');
                conflict.code = 'PAYMENT_REVIEW_CONFLICT';
                conflict.statusCode = 409;
                throw conflict;
            }

            const currentInvoice = await Invoice.findById(currentPayment.invoiceId).session(session);
            if (currentInvoice?.currentPaymentId && String(currentInvoice.currentPaymentId) !== String(currentPayment._id)) throw new Error('This is not the current payment attempt.');
            currentPayment.status = 'rejected';
            currentPayment.rejectionReason = safeReason;
            currentPayment.adminNote = adminNote || currentPayment.adminNote;
            currentPayment.verifiedBy = getActorId(req);
            currentPayment.verifiedAt = rejectedAt;
            await currentPayment.save({ session });

            const rejectedInvoice = await rejectInvoice(currentPayment.invoiceId, {
                notes: safeReason,
                session
            });
            const subscription = await Subscription.findById(rejectedInvoice.subscriptionId).session(session);
            if (subscription) {
                await returnToTrialOrPastDueAfterRejection(subscription, {
                    req,
                    reason: safeReason,
                    session,
                    deferEvents: true
                });
            }
            await enqueueBillingNotifications({ payment: currentPayment, event: 'rejected', session });
            return { payment: currentPayment, invoice: rejectedInvoice, subscription };
        },
        audit: ({ payment: rejectedPayment }) => ({
            req,
            action: 'billing.payment_rejected',
            entityType: 'PaymentTransaction',
            entityId: rejectedPayment._id,
            shop_id: rejectedPayment.shopId,
            message: 'Manual payment rejected by platform billing reviewer',
            reason: safeReason,
            severity: 'warning'
        })
    });
    try { if (result.subscription) await emitDeferredSubscriptionEvent(result.subscription); }
    catch (error) { console.error('Billing subscription event failed:', error.name); }

    return result.payment;
};

module.exports = {
    submitManualPayment,
    verifyManualPayment,
    rejectManualPayment
};
