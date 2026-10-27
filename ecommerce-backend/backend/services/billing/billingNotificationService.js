const { enqueueJob } = require('../jobQueueService');
const Notification = require('../../models/Notification');
const PlatformNotification = require('../../models/PlatformNotification');
const Shop = require('../../models/Shop');
const User = require('../../models/User');
const { sendSuperAdminPaymentSubmittedEmail } = require('../superAdminEmailService');
const BILLING_NOTIFICATION_QUEUE = 'billing-notifications';

// Persist each channel separately in the financial transaction so channel failures can retry independently.
const enqueueBillingNotifications = async ({ payment, event, session }) => {
    for (const channel of event === 'submitted' ? ['vendor', 'platform', 'email'] : ['vendor']) {
        await enqueueJob({ queue: BILLING_NOTIFICATION_QUEUE, name: channel, shop_id: payment.shopId,
            idempotencyKey: `billing:${payment._id}:${event}:${channel}`, session,
            payload: { event, paymentId: String(payment._id), invoiceId: String(payment.invoiceId),
                planName: payment.planName, amount: payment.amount, provider: payment.provider,
                transactionId: payment.transactionId, rejectionReason: payment.rejectionReason || '', submittedAt: payment.createdAt }
        });
    }
};
const processBillingNotificationJob = async job => {
    const data = job.payload;
    const titles = { submitted: 'Payment submitted', approved: 'Payment verified', rejected: 'Payment rejected' };
    if (!titles[data?.event]) throw new Error('Unsupported billing notification event');
    const scope = { shop_id: job.shop_id, entityType: 'PaymentTransaction', entityId: data.paymentId };
    if (job.name === 'vendor') {
        const owners = await User.find({ shop_id: job.shop_id, role: 'VendorAdmin', status: 'Active' }).select('_id').lean();
        for (const owner of owners) {
            await Notification.updateOne({ ...scope, recipient_user_id: owner._id, title: titles[data.event] }, { $setOnInsert: {
                type: 'system', severity: data.event === 'rejected' ? 'warning' : data.event === 'approved' ? 'success' : 'info',
                message: data.event === 'rejected' ? `Your payment was rejected: ${data.rejectionReason}` : data.event === 'approved' ? 'Your payment was approved. Your subscription is now active.' : 'Your payment is pending Super Admin approval.',
                metadata: { invoiceId: data.invoiceId, amount: data.amount }
            } }, { upsert: true });
        }
        return;
    }
    const shop = await Shop.findById(job.shop_id).select('shopName subdomain').lean();
    if (!shop) return { cancelled: true, reason: 'Shop no longer exists' };
    if (job.name === 'platform') {
        await PlatformNotification.updateOne({ ...scope, type: 'subscription.pending_approval' }, { $setOnInsert: {
            recipientType: 'SuperAdmin', title: 'New subscription payment submitted', severity: 'warning',
            message: `${shop.shopName} submitted payment for ${data.planName}.`, metadata: data
        } }, { upsert: true });
        return;
    }
    if (job.name === 'email') {
        if (!(process.env.SUPER_ADMIN_EMAIL || process.env.PLATFORM_OWNER_EMAIL || process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER)) throw new Error('SUPER_ADMIN_EMAIL is not configured');
        const owner = await User.findOne({ shop_id: job.shop_id, role: 'VendorAdmin' }).select('fullName email').lean();
        return sendSuperAdminPaymentSubmittedEmail({ ...data, shopName: shop.shopName, ownerName: owner?.fullName || '', ownerEmail: owner?.email || '', adminPath: '/super-admin/billing' });
    }
    throw new Error('Unsupported billing notification channel');
};
module.exports = { BILLING_NOTIFICATION_QUEUE, enqueueBillingNotifications, processBillingNotificationJob };
