const PaymentTransaction = require('../../models/PaymentTransaction');
const Invoice = require('../../models/Invoice');
const Subscription = require('../../models/Subscription');
const Shop = require('../../models/Shop');
const User = require('../../models/User');
const VendorPlan = require('../../models/VendorPlan');
const UpgradeIntent = require('../../models/UpgradeIntent');
const { logPlatformAudit } = require('../platformAuditLogService');
const { runCriticalGovernanceAction } = require('../platformAuditOutboxService');
const { createNotification } = require('../notificationService');
const { createPlatformNotification } = require('../platformNotificationService');
const { sendSuperAdminPaymentSubmittedEmailSafe } = require('../superAdminEmailService');
const { markInvoiceSubmitted, markInvoicePaid, rejectInvoice } = require('./invoiceService');
const { getPlanSlug } = require('./billingPlanService');
const {
    activateSubscription,
    emitDeferredSubscriptionEvent,
    markPendingApproval,
    returnToTrialOrPastDueAfterRejection
} = require('./subscriptionService');

const getActorId = (req) => req?.user?.accountId || req?.user?.account_id || req?.user?._id || null;

const getShopOwner = async (shopId) => User.findOne({
    shop_id: shopId,
    role: 'VendorAdmin'
}).select('fullName email').lean();

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
    const invoice = await Invoice.findOne({ _id: invoiceId, shopId });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') throw new Error('Invoice is already paid');
    if (invoice.status === 'submitted') throw new Error('This invoice already has a payment waiting for approval');

    const plan = invoice.planId
        ? await VendorPlan.findById(invoice.planId).select('name slug').lean()
        : null;
    const pendingPlanName = plan?.name || invoice.planName || 'Selected plan';
    const pendingPlanSlug = plan?.slug || invoice.planSlug || getPlanSlug(pendingPlanName);

    const payment = await PaymentTransaction.create({
        shopId,
        invoiceId,
        planId: invoice.planId || null,
        planName: pendingPlanName,
        planSlug: pendingPlanSlug,
        provider,
        amount: Number(amount || invoice.amount || 0),
        transactionId,
        senderNumber,
        screenshotUrl,
        status: 'pending',
        submittedBy: getActorId(req)
    });

    const [submittedInvoice, shop, owner] = await Promise.all([
        markInvoiceSubmitted(invoiceId),
        Shop.findById(shopId).select('shopName subdomain').lean(),
        getShopOwner(shopId)
    ]);

    await markPendingApproval({
        subscriptionId: submittedInvoice.subscriptionId,
        planId: submittedInvoice.planId,
        planName: pendingPlanName,
        planSlug: pendingPlanSlug,
        billingCycle: submittedInvoice.billingCycle,
        invoiceId: submittedInvoice._id,
        req
    });

    await logPlatformAudit({
        req,
        action: 'billing.payment_submitted',
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        shop_id: shopId,
        message: 'Manual payment submitted for Super Admin approval',
        metadata: { invoiceId, provider, amount: payment.amount, pendingPlanName }
    });

    await createPlatformNotification({
        recipientType: 'SuperAdmin',
        type: 'subscription.pending_approval',
        title: 'New subscription payment submitted',
        message: `${shop?.shopName || 'A vendor'} submitted payment for ${pendingPlanName}.`,
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        shop_id: shopId,
        severity: 'warning',
        metadata: {
            invoiceId,
            provider,
            amount: payment.amount,
            transactionId,
            planName: pendingPlanName,
            shopName: shop?.shopName || '',
            subdomain: shop?.subdomain || ''
        }
    });

    sendSuperAdminPaymentSubmittedEmailSafe({
        shopName: shop?.shopName || '',
        ownerName: owner?.fullName || '',
        ownerEmail: owner?.email || '',
        planName: pendingPlanName,
        amount: payment.amount,
        provider,
        transactionId,
        submittedAt: payment.createdAt,
        adminPath: '/super-admin/billing'
    });

    await createNotification({
        shop_id: shopId,
        type: 'system',
        title: 'Payment submitted',
        message: 'Your payment is pending Super Admin approval.',
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        severity: 'info',
        metadata: { invoiceId, provider, amount: payment.amount, pendingPlanName }
    });

    return payment;
};

const verifyManualPayment = async ({ paymentId, req = null, adminNote = '' }) => {
    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (['approved', 'verified'].includes(payment.status)) {
        const subscription = await Subscription.findById(invoice.subscriptionId)
            .select('status lastInvoiceId');
        if (
            invoice.status === 'paid' &&
            subscription?.status === 'active' &&
            String(subscription.lastInvoiceId || '') === String(invoice._id)
        ) {
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
    await emitDeferredSubscriptionEvent(result.subscription);

    await createNotification({
        shop_id: result.payment.shopId,
        type: 'system',
        title: 'Payment verified',
        message: 'Your payment was approved. Your subscription is now active.',
        entityType: 'PaymentTransaction',
        entityId: result.payment._id,
        severity: 'success',
        metadata: { invoiceId: result.invoice._id, amount: result.payment.amount }
    });

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
    if (result.subscription) await emitDeferredSubscriptionEvent(result.subscription);

    await createNotification({
        shop_id: result.payment.shopId,
        type: 'system',
        title: 'Payment rejected',
        message: `Your payment was rejected: ${safeReason}`,
        entityType: 'PaymentTransaction',
        entityId: result.payment._id,
        severity: 'warning',
        metadata: { invoiceId: result.payment.invoiceId, reason: safeReason }
    });

    return result.payment;
};

module.exports = {
    submitManualPayment,
    verifyManualPayment,
    rejectManualPayment
};
