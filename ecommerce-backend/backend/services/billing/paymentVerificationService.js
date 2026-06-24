const PaymentTransaction = require('../../models/PaymentTransaction');
const Invoice = require('../../models/Invoice');
const { logPlatformAudit } = require('../platformAuditLogService');
const { createNotification } = require('../notificationService');
const { markInvoiceSubmitted, markInvoicePaid, rejectInvoice } = require('./invoiceService');
const { activateSubscription } = require('./subscriptionService');

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
    const invoice = await Invoice.findOne({ _id: invoiceId, shopId });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') throw new Error('Invoice is already paid');

    const payment = await PaymentTransaction.create({
        shopId,
        invoiceId,
        provider,
        amount: Number(amount || invoice.amount || 0),
        transactionId,
        senderNumber,
        screenshotUrl,
        status: 'pending',
        submittedBy: getActorId(req)
    });

    await markInvoiceSubmitted(invoiceId);

    await logPlatformAudit({
        req,
        action: 'billing.payment_submitted',
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        shop_id: shopId,
        message: 'Manual payment submitted for verification',
        metadata: { invoiceId, provider, amount: payment.amount }
    });

    await createNotification({
        shop_id: shopId,
        type: 'system',
        title: 'Payment submitted',
        message: 'Your payment is pending Super Admin verification.',
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        severity: 'info',
        metadata: { invoiceId, provider, amount: payment.amount }
    });

    return payment;
};

const verifyManualPayment = async ({ paymentId, req = null, adminNote = '' }) => {
    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'verified') return payment;

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    payment.status = 'verified';
    payment.verifiedBy = getActorId(req);
    payment.verifiedAt = new Date();
    payment.adminNote = adminNote || payment.adminNote;
    payment.rejectionReason = '';
    await payment.save();

    const paidInvoice = await markInvoicePaid(invoice._id, { notes: adminNote });
    await activateSubscription({
        subscriptionId: paidInvoice.subscriptionId,
        planId: paidInvoice.planId,
        billingCycle: paidInvoice.billingCycle,
        invoiceId: paidInvoice._id,
        req
    });

    await logPlatformAudit({
        req,
        action: 'billing.payment_verified',
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        shop_id: payment.shopId,
        message: 'Manual payment verified by Super Admin',
        metadata: { invoiceId: invoice._id, provider: payment.provider, amount: payment.amount }
    });

    await createNotification({
        shop_id: payment.shopId,
        type: 'system',
        title: 'Payment verified',
        message: 'Your payment was verified. Your subscription is now active.',
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        severity: 'success',
        metadata: { invoiceId: invoice._id, amount: payment.amount }
    });

    return payment;
};

const rejectManualPayment = async ({ paymentId, rejectionReason, req = null, adminNote = '' }) => {
    if (!rejectionReason || !String(rejectionReason).trim()) {
        throw new Error('Rejection reason is required');
    }

    const payment = await PaymentTransaction.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'verified') throw new Error('Verified payments cannot be rejected');

    payment.status = 'rejected';
    payment.rejectionReason = String(rejectionReason).trim();
    payment.adminNote = adminNote || payment.adminNote;
    payment.verifiedBy = getActorId(req);
    payment.verifiedAt = new Date();
    await payment.save();

    await rejectInvoice(payment.invoiceId, { notes: payment.rejectionReason });

    await logPlatformAudit({
        req,
        action: 'billing.payment_rejected',
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        shop_id: payment.shopId,
        message: 'Manual payment rejected by Super Admin',
        reason: payment.rejectionReason,
        severity: 'warning'
    });

    await createNotification({
        shop_id: payment.shopId,
        type: 'system',
        title: 'Payment rejected',
        message: `Your payment was rejected: ${payment.rejectionReason}`,
        entityType: 'PaymentTransaction',
        entityId: payment._id,
        severity: 'warning',
        metadata: { invoiceId: payment.invoiceId, reason: payment.rejectionReason }
    });

    return payment;
};

module.exports = {
    submitManualPayment,
    verifyManualPayment,
    rejectManualPayment
};
