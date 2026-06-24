const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const PaymentTransaction = require('../models/PaymentTransaction');
const VendorPlan = require('../models/VendorPlan');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const { createNotification } = require('../services/notificationService');
const {
    getPlanByNameOrDefault,
    calculatePlanPrice,
    normalizePlanName
} = require('../services/billing/billingPlanService');
const {
    ensureSubscriptionExists,
    getCurrentSubscriptionForShop,
    activateSubscription,
    markPastDue,
    enterGracePeriod,
    suspendForBilling,
    cancelSubscription,
    TRIAL_DAYS,
    GRACE_DAYS
} = require('../services/billing/subscriptionService');
const { createInvoice } = require('../services/billing/invoiceService');
const {
    submitManualPayment,
    verifyManualPayment,
    rejectManualPayment
} = require('../services/billing/paymentVerificationService');
const { runBillingLifecycleCheck } = require('../services/billing/billingLifecycleService');

const getPagination = (query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

const paginationMeta = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit))
});

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const daysUntil = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

const serializeSubscription = (subscription) => {
    if (!subscription) return null;
    const plain = subscription.toObject ? subscription.toObject() : subscription;
    return {
        id: plain._id,
        shopId: plain.shopId,
        planId: plain.planId,
        status: plain.status,
        billingCycle: plain.billingCycle,
        trialStartedAt: plain.trialStartedAt,
        trialEndsAt: plain.trialEndsAt,
        trialDaysLeft: daysUntil(plain.trialEndsAt),
        currentPeriodStart: plain.currentPeriodStart,
        currentPeriodEnd: plain.currentPeriodEnd,
        graceEndsAt: plain.graceEndsAt,
        graceDaysLeft: daysUntil(plain.graceEndsAt),
        lastInvoiceId: plain.lastInvoiceId,
        cancelledAt: plain.cancelledAt,
        suspendedAt: plain.suspendedAt,
        suspensionReason: plain.suspensionReason || ''
    };
};

const getOwnerMap = async (shopIds) => {
    const owners = await User.find({
        shop_id: { $in: shopIds },
        role: 'VendorAdmin'
    }).select('shop_id fullName email').lean();

    return owners.reduce((acc, owner) => {
        acc[String(owner.shop_id)] = {
            id: owner._id,
            fullName: owner.fullName,
            email: owner.email
        };
        return acc;
    }, {});
};

const serializeInvoice = (invoice) => {
    if (!invoice) return null;
    const plain = invoice.toObject ? invoice.toObject() : invoice;
    return {
        id: plain._id,
        shopId: plain.shopId,
        subscriptionId: plain.subscriptionId,
        planId: plain.planId,
        invoiceNumber: plain.invoiceNumber,
        amount: plain.amount,
        currency: plain.currency,
        billingCycle: plain.billingCycle,
        status: plain.status,
        dueDate: plain.dueDate,
        paidAt: plain.paidAt,
        notes: plain.notes || '',
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };
};

const serializePayment = (payment) => {
    if (!payment) return null;
    const plain = payment.toObject ? payment.toObject() : payment;
    return {
        id: plain._id,
        shopId: plain.shopId,
        invoiceId: plain.invoiceId,
        provider: plain.provider,
        amount: plain.amount,
        transactionId: plain.transactionId,
        senderNumber: plain.senderNumber,
        screenshotUrl: plain.screenshotUrl,
        status: plain.status,
        submittedBy: plain.submittedBy,
        verifiedBy: plain.verifiedBy,
        verifiedAt: plain.verifiedAt,
        rejectionReason: plain.rejectionReason || '',
        adminNote: plain.adminNote || '',
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };
};

const getShopIdFromReq = (req) => req.tenantId || req.user?.shopId || req.user?.shop_id;

exports.getVendorBillingCurrent = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const shop = await Shop.findById(shopId).select('shopName plan featureFlags approvalStatus isActive suspensionReason');
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const subscription = await ensureSubscriptionExists(shop);
        const planName = shop.plan?.name || 'Starter';
        const plan = await getPlanByNameOrDefault(planName);
        const latestInvoice = await Invoice.findOne({ shopId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                subscription: serializeSubscription(subscription),
                plan,
                latestInvoice: serializeInvoice(latestInvoice),
                trialDays: TRIAL_DAYS,
                graceDays: GRACE_DAYS
            }
        });
    } catch (err) {
        console.error('Get vendor billing current error:', err);
        res.status(500).json({ success: false, error: 'Failed to load billing status' });
    }
};

exports.getVendorInvoices = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const { page, limit, skip } = getPagination(req.query);
        const query = { shopId };
        if (req.query.status) query.status = req.query.status;

        const [items, total] = await Promise.all([
            Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Invoice.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: items.map(serializeInvoice),
            pagination: paginationMeta({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
};

exports.getVendorPayments = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const { page, limit, skip } = getPagination(req.query);
        const query = { shopId };
        if (req.query.status) query.status = req.query.status;

        const [items, total] = await Promise.all([
            PaymentTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            PaymentTransaction.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: items.map(serializePayment),
            pagination: paginationMeta({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
};

exports.submitVendorManualPayment = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const invoiceId = req.params.invoiceId || req.body.invoiceId;
        const { provider, amount, transactionId, senderNumber, screenshotUrl } = req.body;

        if (!isValidObjectId(invoiceId)) {
            return res.status(400).json({ success: false, error: 'Valid invoiceId is required' });
        }

        if (!['manual_bkash', 'manual_nagad', 'manual_bank', 'other'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Valid manual payment provider is required' });
        }

        const payment = await submitManualPayment({
            shopId,
            invoiceId,
            provider,
            amount,
            transactionId,
            senderNumber,
            screenshotUrl,
            req
        });

        res.status(201).json({ success: true, data: serializePayment(payment) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to submit payment' });
    }
};

exports.createVendorInvoice = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const shop = await Shop.findById(shopId).select('plan');
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const planName = normalizePlanName(req.body.planName || req.body.plan || shop.plan?.name || 'Starter');
        const billingCycle = req.body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
        const plan = await VendorPlan.findOne({ name: planName, isActive: { $ne: false } });
        const fallbackPlan = await getPlanByNameOrDefault(planName);
        const subscription = await ensureSubscriptionExists(shop);
        const amount = await calculatePlanPrice(plan?._id || planName, billingCycle);
        const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const invoice = await createInvoice({
            shopId,
            subscriptionId: subscription._id,
            planId: plan?._id || null,
            billingCycle,
            amount,
            dueDate,
            notes: `Vendor selected ${planName} ${billingCycle} plan.`
        });

        await createNotification({
            shop_id: shopId,
            type: 'system',
            title: 'Billing invoice created',
            message: `Your ${planName} ${billingCycle} invoice for ৳${Number(amount || 0).toLocaleString()} is ready for manual payment.`,
            entityType: 'Invoice',
            entityId: invoice._id,
            severity: 'info',
            metadata: { planName: fallbackPlan.name, billingCycle, amount }
        });

        res.status(201).json({ success: true, data: serializeInvoice(invoice) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to create invoice' });
    }
};

exports.getSuperAdminBillingOverview = async (req, res) => {
    try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const [subscriptions, invoices, payments, revenueByPlan] = await Promise.all([
            Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
            PaymentTransaction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
            Invoice.aggregate([
                { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
                {
                    $lookup: {
                        from: 'vendorplans',
                        localField: 'planId',
                        foreignField: '_id',
                        as: 'plan'
                    }
                },
                { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { plan: { $ifNull: ['$plan.name', 'Unknown'] }, cycle: '$billingCycle' },
                        amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.plan': 1, '_id.cycle': 1 } }
            ])
        ]);

        const subCount = Object.fromEntries(subscriptions.map(item => [item._id, item.count]));
        const invoiceCount = Object.fromEntries(invoices.map(item => [item._id, item.count]));
        const invoiceAmount = Object.fromEntries(invoices.map(item => [item._id, item.amount]));
        const paymentCount = Object.fromEntries(payments.map(item => [item._id, item.count]));
        const [trialsEndingSoon, billingSuspended] = await Promise.all([
            Subscription.countDocuments({ status: 'trialing', trialEndsAt: { $lte: soon, $gte: new Date() } }),
            Subscription.countDocuments({ status: 'suspended' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                subscriptions,
                invoices,
                payments,
                summary: {
                    activeSubscriptions: subCount.active || 0,
                    trialingShops: subCount.trialing || 0,
                    trialsEndingSoon,
                    pastDueShops: (subCount.past_due || 0) + (subCount.grace || 0),
                    pendingManualPayments: paymentCount.pending || 0,
                    suspendedForBilling: billingSuspended,
                    revenueThisMonth: invoiceAmount.paid || 0,
                    paidInvoicesThisMonth: invoiceCount.paid || 0
                },
                revenueByPlan
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load billing overview' });
    }
};

exports.getSuperAdminSubscriptions = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.shopId && isValidObjectId(req.query.shopId)) query.shopId = req.query.shopId;

        const [items, total] = await Promise.all([
            Subscription.find(query).populate('shopId', 'shopName subdomain approvalStatus isActive suspensionReason').populate('planId', 'name monthlyPrice yearlyPrice').sort({ updatedAt: -1 }).skip(skip).limit(limit),
            Subscription.countDocuments(query)
        ]);
        const shopIds = items.map(item => item.shopId?._id || item.shopId).filter(Boolean);
        const ownerMap = await getOwnerMap(shopIds);
        const [productCounts, orderCounts] = await Promise.all([
            Product.aggregate([
                { $match: { shop_id: { $in: shopIds }, isDeleted: { $ne: true } } },
                { $group: { _id: '$shop_id', count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                { $match: { shop_id: { $in: shopIds }, isDeleted: { $ne: true } } },
                { $group: { _id: '$shop_id', count: { $sum: 1 } } }
            ])
        ]);
        const productMap = Object.fromEntries(productCounts.map(item => [String(item._id), item.count]));
        const orderMap = Object.fromEntries(orderCounts.map(item => [String(item._id), item.count]));

        res.status(200).json({
            success: true,
            data: items.map(item => {
                const row = serializeSubscription(item);
                const shopId = String(item.shopId?._id || item.shopId || '');
                return {
                    ...row,
                    shop: item.shopId && typeof item.shopId === 'object' ? item.shopId : null,
                    plan: item.planId && typeof item.planId === 'object' ? item.planId : null,
                    owner: ownerMap[shopId] || null,
                    metrics: {
                        products: productMap[shopId] || 0,
                        orders: orderMap[shopId] || 0
                    }
                };
            }),
            pagination: paginationMeta({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
    }
};

exports.getSuperAdminInvoices = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.shopId && isValidObjectId(req.query.shopId)) query.shopId = req.query.shopId;
        if (req.query.search) query.invoiceNumber = { $regex: String(req.query.search), $options: 'i' };

        const [items, total] = await Promise.all([
            Invoice.find(query).populate('shopId', 'shopName subdomain').populate('planId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Invoice.countDocuments(query)
        ]);
        const payments = await PaymentTransaction.find({
            invoiceId: { $in: items.map(item => item._id) }
        }).sort({ createdAt: -1 }).lean();
        const paymentMap = payments.reduce((acc, payment) => {
            const key = String(payment.invoiceId);
            if (!acc[key]) acc[key] = payment;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: items.map(item => ({
                ...serializeInvoice(item),
                shop: item.shopId && typeof item.shopId === 'object' ? item.shopId : null,
                plan: item.planId && typeof item.planId === 'object' ? item.planId : null,
                submittedPayment: paymentMap[String(item._id)] || null
            })),
            pagination: paginationMeta({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
};

exports.getSuperAdminPayments = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.provider) query.provider = req.query.provider;
        if (req.query.shopId && isValidObjectId(req.query.shopId)) query.shopId = req.query.shopId;
        if (req.query.search) query.transactionId = { $regex: String(req.query.search), $options: 'i' };

        const [items, total] = await Promise.all([
            PaymentTransaction.find(query).populate('shopId', 'shopName subdomain').populate('invoiceId', 'invoiceNumber amount status billingCycle').sort({ createdAt: -1 }).skip(skip).limit(limit),
            PaymentTransaction.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: items.map(item => ({
                ...serializePayment(item),
                shop: item.shopId && typeof item.shopId === 'object' ? item.shopId : null,
                invoice: item.invoiceId && typeof item.invoiceId === 'object' ? item.invoiceId : null
            })),
            pagination: paginationMeta({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
};

exports.updateSuperAdminSubscriptionStatus = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ success: false, error: 'Subscription not found' });

        const { status, reason, billingCycle } = req.body;
        if (!['trialing', 'active', 'past_due', 'grace', 'suspended', 'cancelled'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Valid subscription status is required' });
        }

        let updated = subscription;
        if (status === 'active') {
            updated = await activateSubscription({
                subscription,
                planId: subscription.planId,
                billingCycle: billingCycle || subscription.billingCycle,
                req
            });
        } else if (status === 'past_due') {
            updated = await markPastDue(subscription);
        } else if (status === 'grace') {
            updated = await enterGracePeriod(subscription);
        } else if (status === 'suspended') {
            if (!reason) return res.status(400).json({ success: false, error: 'Reason is required to suspend billing' });
            updated = await suspendForBilling(subscription, { req, reason });
        } else if (status === 'cancelled') {
            updated = await cancelSubscription(subscription);
        } else {
            subscription.status = status;
            updated = await subscription.save();
        }

        await logPlatformAudit({
            req,
            action: 'billing.subscription_status_changed',
            entityType: 'Subscription',
            entityId: updated._id,
            shop_id: updated.shopId,
            message: `Subscription status changed to ${updated.status}`,
            reason: reason || '',
            severity: updated.status === 'suspended' ? 'warning' : 'info'
        });

        res.status(200).json({ success: true, data: serializeSubscription(updated) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to update subscription' });
    }
};

exports.createSuperAdminInvoice = async (req, res) => {
    try {
        const { shopId, planId, billingCycle = 'monthly', amount, dueDate, notes } = req.body;
        if (!isValidObjectId(shopId)) return res.status(400).json({ success: false, error: 'Valid shopId is required' });

        const subscription = await ensureSubscriptionExists(shopId);
        const finalPlanId = planId || subscription.planId;
        const finalAmount = amount ?? await calculatePlanPrice(finalPlanId || 'Starter', billingCycle);

        const invoice = await createInvoice({
            shopId,
            subscriptionId: subscription._id,
            planId: finalPlanId,
            billingCycle,
            amount: finalAmount,
            dueDate,
            notes
        });

        await logPlatformAudit({
            req,
            action: 'billing.invoice_created',
            entityType: 'Invoice',
            entityId: invoice._id,
            shop_id: shopId,
            message: 'Billing invoice created by Super Admin',
            metadata: { amount: invoice.amount, billingCycle }
        });

        await createNotification({
            shop_id: shopId,
            type: 'system',
            title: 'Billing invoice created',
            message: `A billing invoice for ৳${Number(invoice.amount || 0).toLocaleString()} is ready for manual payment.`,
            entityType: 'Invoice',
            entityId: invoice._id,
            severity: 'info',
            metadata: { billingCycle, amount: invoice.amount }
        });

        res.status(201).json({ success: true, data: serializeInvoice(invoice) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to create invoice' });
    }
};

exports.updateSuperAdminInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

        const allowed = ['status', 'dueDate', 'notes', 'amount'];
        allowed.forEach((key) => {
            if (req.body[key] !== undefined) invoice[key] = req.body[key];
        });
        await invoice.save();

        await logPlatformAudit({
            req,
            action: 'billing.invoice_updated',
            entityType: 'Invoice',
            entityId: invoice._id,
            shop_id: invoice.shopId,
            message: 'Billing invoice updated by Super Admin',
            metadata: { status: invoice.status, amount: invoice.amount }
        });

        res.status(200).json({ success: true, data: serializeInvoice(invoice) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to update invoice' });
    }
};

exports.verifySuperAdminPayment = async (req, res) => {
    try {
        const payment = await verifyManualPayment({
            paymentId: req.params.id,
            req,
            adminNote: req.body.adminNote || ''
        });

        res.status(200).json({ success: true, data: serializePayment(payment) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to verify payment' });
    }
};

exports.rejectSuperAdminPayment = async (req, res) => {
    try {
        const payment = await rejectManualPayment({
            paymentId: req.params.id,
            rejectionReason: req.body.rejectionReason || req.body.reason,
            req,
            adminNote: req.body.adminNote || ''
        });

        res.status(200).json({ success: true, data: serializePayment(payment) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to reject payment' });
    }
};

exports.runSuperAdminBillingLifecycleCheck = async (req, res) => {
    try {
        const result = await runBillingLifecycleCheck({ req });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to run billing lifecycle check' });
    }
};
