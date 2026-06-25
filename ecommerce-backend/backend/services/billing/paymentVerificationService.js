const PaymentTransaction = require('../../models/PaymentTransaction');
const Invoice = require('../../models/Invoice');
const Subscription = require('../../models/Subscription');
const Shop = require('../../models/Shop');
const User = require('../../models/User');
const VendorPlan = require('../../models/VendorPlan');
const { logPlatformAudit } = require('../platformAuditLogService');
const { createNotification } = require('../notificationService');
const { createPlatformNotification } = require('../platformNotificationService');
const { sendSuperAdminPaymentSubmittedEmailSafe } = require('../superAdminEmailService');
const { markInvoiceSubmitted, markInvoicePaid, rejectInvoice } = require('./invoiceService');
const {
    activateSubscription,
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

    const [submittedInvoice, plan, shop, owner] = await Promise.all([
        markInvoiceSubmitted(invoiceId),
        invoice.planId ? VendorPlan.findById(invoice.planId).select('name').lean() : null,
        Shop.findById(shopId).select('shopName subdomain').lean(),
        getShopOwner(shopId)
    ]);
    const pendingPlanName = plan?.name || 'Selected plan';

    await markPendingApproval({
        subscriptionId: submittedInvoice.subscriptionId,
        planId: submittedInvoice.planId,
        planName: pendingPlanName,
        billingCycle: submittedInvoice.billingCycle,
        invoiceId: submittedInvoice._id
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
    if (['approved', 'verified'].includes(payment.status)) return payment;

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    payment.status = 'approved';
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
        message: 'Manual payment approved by Super Admin',
        metadata: { invoiceId: invoice._id, provider: payment.provider, amount: payment.amount }
    });

    await createNotification({
        shop_id: payment.shopId,
        type: 'system',
        title: 'Payment verified',
        message: 'Your payment was approved. Your subscription is now active.',
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
    if (['approved', 'verified'].includes(payment.status)) throw new Error('Approved payments cannot be rejected');

    payment.status = 'rejected';
    payment.rejectionReason = String(rejectionReason).trim();
    payment.adminNote = adminNote || payment.adminNote;
    payment.verifiedBy = getActorId(req);
    payment.verifiedAt = new Date();
    await payment.save();

    const invoice = await rejectInvoice(payment.invoiceId, { notes: payment.rejectionReason });
    const subscription = await Subscription.findById(invoice.subscriptionId);
    if (subscription) {
        await returnToTrialOrPastDueAfterRejection(subscription);
    }

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
