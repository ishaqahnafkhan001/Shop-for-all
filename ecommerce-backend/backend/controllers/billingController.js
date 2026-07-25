const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const PaymentTransaction = require('../models/PaymentTransaction');
const VendorPlan = require('../models/VendorPlan');
const { getShopPlanAccess } = require('../services/billing/planAccessService');
const { getSubscriptionUsage, toLegacyUsageShape } = require('../services/billing/subscriptionUsageService');
const { listSubscriptionAuditTimeline } = require('../services/billing/subscriptionAuditService');
const { listSubscriptionAnalytics } = require('../services/billing/subscriptionAnalyticsService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../services/billing/subscriptionEvents');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const { createNotification } = require('../services/notificationService');
const {
    getPlanBySlugOrNameOrDefault,
    calculatePlanPrice,
    getPlanSlug,
    normalizePlanName
} = require('../services/billing/billingPlanService');
const { getBillingDisplayForSubscription } = require('../services/billing/billingDisplayService');
const {
    ensureSubscriptionExists,
    getCurrentSubscriptionForShop,
    TRIAL_DAYS,
    GRACE_DAYS
} = require('../services/billing/subscriptionService');
const { createInvoice } = require('../services/billing/invoiceService');
const {
    submitManualPayment,
    verifyManualPayment,
    rejectManualPayment
} = require('../services/billing/paymentVerificationService');
const {
    createAuditIntent,
    materializeAuditIntent,
    runCriticalGovernanceAction
} = require('../services/platformAuditOutboxService');
const { runBillingLifecycleCheck } = require('../services/billing/billingLifecycleService');
const {
    getDowngradePreview,
    scheduleDowngrade,
    cancelScheduledDowngrade
} = require('../services/billing/subscriptionDowngradeService');
const {
    selectBeginnerPrompt,
    dismissPrompt,
    createUpgradeIntent,
    resolveUpgradeIntent
} = require('../services/billing/beginnerConversionService');
const { getFeatureDefinition } = require('../config/subscriptionFeatures');
const { resolveSubscriptionAccess } = require('../services/billing/subscriptionAccessResolver');
const {
    allowedActionsForSubscription,
    executeSubscriptionAction
} = require('../services/billing/superAdminSubscriptionTransitionService');
const {
    serializePaymentSummary,
    serializeSubscriptionSummary
} = require('../services/superAdmin/superAdminSerializers');

const UPGRADE_INTENT_LIMIT_KEYS = new Set([
    'productCount',
    'imagesPerProduct',
    'staffAccounts',
    'aiProductCreationsPerWeek'
]);

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
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeSearchRegex = (value) => {
    const normalized = String(value || '').trim().slice(0, 80);
    return normalized ? new RegExp(escapeRegex(normalized), 'i') : null;
};

const getReportingMonthRange = (now = new Date()) => {
    const offsetMinutes = Number(process.env.REPORTING_TIMEZONE_OFFSET_MINUTES || 360);
    const offsetMs = offsetMinutes * 60 * 1000;
    const shifted = new Date(now.getTime() + offsetMs);
    const monthStart = new Date(Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        1
    ) - offsetMs);
    const nextMonthStart = new Date(Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth() + 1,
        1
    ) - offsetMs);
    return { monthStart, nextMonthStart, offsetMinutes };
};

const daysUntil = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

const serializeSubscription = (subscription) => {
    if (!subscription) return null;
    const plain = subscription.toObject ? subscription.toObject() : subscription;
    const access = resolveSubscriptionAccess({ subscription: plain });
    return {
        id: plain._id,
        shopId: plain.shopId,
        planId: plain.planId,
        activePlanName: plain.activePlanName || '',
        activePlanSlug: plain.activePlanSlug || '',
        intendedPlanId: plain.intendedPlanId || null,
        intendedPlanName: plain.intendedPlanName || '',
        intendedPlanSlug: plain.intendedPlanSlug || '',
        status: access.subscriptionStatus,
        rawStatus: access.rawSubscriptionStatus,
        paymentReviewStatus: access.paymentReviewStatus,
        isTrialActive: access.isTrialActive,
        isOperational: access.isOperational,
        entitlementVersion: access.entitlementVersion,
        version: Number(plain.__v) || 0,
        billingCycle: plain.billingCycle,
        pendingPlanId: plain.pendingPlanId,
        pendingPlanName: plain.pendingPlanName || '',
        pendingPlanSlug: plain.pendingPlanSlug || '',
        pendingPlanEffectiveAt: plain.pendingPlanEffectiveAt || null,
        reconciliation: plain.reconciliation || null,
        trialStartedAt: plain.trialStartedAt,
        trialEndsAt: plain.trialEndsAt,
        trialDaysLeft: daysUntil(plain.trialEndsAt),
        currentPeriodStart: plain.currentPeriodStart,
        currentPeriodEnd: plain.currentPeriodEnd,
        activatedAt: plain.activatedAt,
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
        planName: plain.planName || '',
        planSlug: plain.planSlug || '',
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
        planId: plain.planId || null,
        planName: plain.planName || '',
        planSlug: plain.planSlug || '',
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
        const activePlan = subscription.planId
            ? await VendorPlan.findById(subscription.planId).lean()
            : null;
        const pendingPlan = subscription.pendingPlanId
            ? await VendorPlan.findById(subscription.pendingPlanId).lean()
            : null;
        const display = getBillingDisplayForSubscription({ subscription, activePlan, pendingPlan });
        const plan = ['active', 'past_due', 'grace', 'suspended', 'cancelled'].includes(subscription.status) && activePlan
            ? activePlan
            : await getPlanBySlugOrNameOrDefault(display.effectivePlanSlug || display.effectivePlanName || 'starter');
        const latestInvoice = await Invoice.findOne({ shopId }).sort({ createdAt: -1 });
        const access = await getShopPlanAccess(shop);
        const [usagePayload, availablePlans] = await Promise.all([
            getSubscriptionUsage(shop, { access }),
            Promise.all(['beginner', 'starter', 'growth', 'pro'].map(getPlanBySlugOrNameOrDefault))
        ]);

        res.status(200).json({
            success: true,
            data: {
                subscription: serializeSubscription(subscription),
                plan,
                activePlan,
                pendingPlan,
                displayPlan: display.displayPlan,
                billingDisplay: display,
                latestInvoice: serializeInvoice(latestInvoice),
                planAccess: {
                    planKey: access.planKey,
                    planName: access.planName,
                    monthlyPrice: access.plan.monthlyPrice,
                    currency: access.plan.currency || 'BDT',
                    subscriptionStatus: access.subscriptionStatus,
                    limits: access.limits,
                    features: access.features,
                    storeBuilderAccess: access.storeBuilderAccess,
                    storeBuilderCapabilities: access.storeBuilderCapabilities,
                    usage: toLegacyUsageShape(usagePayload),
                    usageDetails: usagePayload.usage,
                    warnings: usagePayload.warnings
                },
                availablePlans: availablePlans.map(item => ({
                    key: getPlanSlug(item),
                    name: item.name,
                    monthlyPrice: item.monthlyPrice,
                    yearlyPrice: item.yearlyPrice,
                    currency: item.currency || 'BDT',
                    limits: item.limits,
                    features: item.features,
                    storeBuilderAccess: item.storeBuilderAccess,
                    badgeEligible: Boolean(item.badgeEligible)
                })),
                trialDays: TRIAL_DAYS,
                graceDays: GRACE_DAYS
            }
        });
    } catch (err) {
        console.error('Get vendor billing current error:', err);
        res.status(500).json({ success: false, error: 'Failed to load billing status' });
    }
};

exports.getVendorBillingUsage = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const data = await getSubscriptionUsage(shopId, { evaluateWarnings: true, req });
        res.status(200).json({ success: true, ...data, data });
    } catch (err) {
        console.error('Get vendor billing usage error:', err);
        res.status(err.statusCode || 500).json({ success: false, error: 'Failed to load plan usage' });
    }
};

const serializeDowngradePreview = (preview) => ({
    currentPlan: {
        key: getPlanSlug(preview.currentPlan),
        name: preview.currentPlan.name
    },
    targetPlan: {
        key: getPlanSlug(preview.targetPlan),
        name: preview.targetPlan.name,
        limits: preview.targetPlan.limits,
        features: preview.targetPlan.features
    },
    effectiveAt: preview.effectiveAt,
    requiresProductSelection: preview.requiresProductSelection,
    productCount: preview.productCount,
    productLimit: preview.productLimit,
    selectedProductCount: preview.selectedProductCount,
    availableProducts: preview.availableProducts,
    retainedProducts: preview.retainedProducts,
    productsToArchive: preview.productsToArchive,
    requestedRetainedProductIds: preview.requestedRetainedProductIds,
    resolvedRetainedProductIds: preview.resolvedRetainedProductIds,
    effects: preview.effects
});

exports.previewVendorDowngrade = async (req, res) => {
    try {
        const preview = await getDowngradePreview({
            shopId: getShopIdFromReq(req),
            targetPlanRef: req.body?.planKey || req.body?.planSlug || req.body?.planName,
            retainedProductIds: req.body?.retainedProductIds
        });
        res.status(200).json({ success: true, data: serializeDowngradePreview(preview) });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'DOWNGRADE_PREVIEW_FAILED',
            error: err.message || 'Unable to preview this downgrade.'
        });
    }
};

exports.scheduleVendorDowngrade = async (req, res) => {
    try {
        const subscription = await scheduleDowngrade({
            shopId: getShopIdFromReq(req),
            targetPlanRef: req.body?.planKey || req.body?.planSlug || req.body?.planName,
            retainedProductIds: req.body?.retainedProductIds,
            reason: req.body?.reason || '',
            req
        });
        res.status(202).json({
            success: true,
            message: `Downgrade to ${subscription.pendingPlanName} is scheduled for the current period end.`,
            data: serializeSubscription(subscription)
        });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'DOWNGRADE_SCHEDULE_FAILED',
            error: err.message || 'Unable to schedule this downgrade.',
            ...(err.preview ? { preview: serializeDowngradePreview(err.preview) } : {})
        });
    }
};

exports.cancelVendorDowngrade = async (req, res) => {
    try {
        const subscription = await cancelScheduledDowngrade({
            shopId: getShopIdFromReq(req),
            reason: req.body?.reason || '',
            req
        });
        if (!subscription) {
            return res.status(404).json({
                success: false,
                code: 'PENDING_DOWNGRADE_NOT_FOUND',
                error: 'No pending downgrade was found.'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Scheduled downgrade cancelled.',
            data: serializeSubscription(subscription)
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            code: 'DOWNGRADE_CANCEL_FAILED',
            error: err.message || 'Unable to cancel this downgrade.'
        });
    }
};

exports.getVendorDowngradeStatus = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ shopId: getShopIdFromReq(req) });
        if (!subscription) {
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }
        return res.status(200).json({
            success: true,
            data: {
                pendingPlanEffectiveAt: subscription.pendingPlanEffectiveAt || null,
                pendingPlanName: subscription.pendingPlanName || '',
                pendingPlanSlug: subscription.pendingPlanSlug || '',
                reconciliation: subscription.reconciliation || null
            }
        });
    } catch {
        return res.status(500).json({
            success: false,
            error: 'Unable to load downgrade status.'
        });
    }
};

exports.getVendorConversionPrompt = async (req, res) => {
    try {
        const data = await selectBeginnerPrompt({
            shopId: getShopIdFromReq(req),
            surface: String(req.query?.surface || 'overview').slice(0, 60),
            req
        });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get conversion prompt error:', err);
        return res.status(500).json({
            success: false,
            error: 'Unable to load the current growth recommendation.'
        });
    }
};

exports.dismissVendorConversionPrompt = async (req, res) => {
    try {
        const category = String(req.params.category || '').trim();
        if (!category || !/^[a-z0-9_-]{1,80}$/i.test(category)) {
            return res.status(400).json({ success: false, error: 'A valid prompt category is required.' });
        }
        const data = await dismissPrompt({
            shopId: getShopIdFromReq(req),
            category,
            milestoneKey: req.body?.milestoneKey || '',
            req
        });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Dismiss conversion prompt error:', err);
        return res.status(500).json({ success: false, error: 'Unable to dismiss this recommendation.' });
    }
};

exports.createVendorUpgradeIntent = async (req, res) => {
    try {
        const capability = String(req.body?.capability || '').trim();
        const limitKey = String(req.body?.limitKey || '').trim();
        if (capability && !getFeatureDefinition(capability)) {
            return res.status(400).json({ success: false, error: 'Unknown plan capability.' });
        }
        if (limitKey && !UPGRADE_INTENT_LIMIT_KEYS.has(limitKey)) {
            return res.status(400).json({ success: false, error: 'Unknown plan limit.' });
        }
        if (!capability && !limitKey) {
            return res.status(400).json({
                success: false,
                error: 'A capability or plan limit is required.'
            });
        }
        const data = await createUpgradeIntent({
            shopId: getShopIdFromReq(req),
            userId: req.user?._id || req.user?.id || null,
            capability,
            limitKey,
            returnTo: req.body?.returnTo,
            req
        });
        return res.status(201).json({ success: true, data });
    } catch (err) {
        console.error('Create upgrade intent error:', err);
        return res.status(500).json({ success: false, error: 'Unable to begin the upgrade flow.' });
    }
};

exports.getVendorUpgradeIntent = async (req, res) => {
    try {
        const data = await resolveUpgradeIntent({
            shopId: getShopIdFromReq(req),
            token: req.params.token
        });
        if (!data) {
            return res.status(404).json({
                success: false,
                code: 'UPGRADE_INTENT_NOT_FOUND',
                error: 'This upgrade link is invalid or has expired.'
            });
        }
        return res.status(200).json({ success: true, data });
    } catch {
        return res.status(404).json({
            success: false,
            code: 'UPGRADE_INTENT_NOT_FOUND',
            error: 'This upgrade link is invalid or has expired.'
        });
    }
};

exports.forceSuperAdminDowngrade = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }
        const updated = await scheduleDowngrade({
            shopId: subscription.shopId,
            targetPlanRef: req.body?.planKey || req.body?.planSlug || req.body?.planName,
            retainedProductIds: req.body?.retainedProductIds,
            reason: req.body?.reason || 'Forced by Super Admin',
            forceImmediate: true,
            req
        });
        return res.status(200).json({ success: true, data: serializeSubscription(updated) });
    } catch (err) {
        return res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'FORCED_DOWNGRADE_FAILED',
            error: err.message || 'Unable to apply the forced downgrade.'
        });
    }
};

exports.getVendorSubscriptionTimeline = async (req, res) => {
    try {
        const result = await listSubscriptionAuditTimeline({
            shopId: getShopIdFromReq(req),
            query: req.query,
            vendorSafe: true
        });
        res.status(200).json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load subscription timeline' });
    }
};

exports.trackVendorUpgradeClicked = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const plan = await getPlanBySlugOrNameOrDefault(req.body?.planKey || req.body?.planName || 'growth');
        await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.UPGRADE_CLICKED, {
            req,
            shopId,
            planKey: getPlanSlug(plan),
            affectedResources: ['subscription'],
            metadata: { targetPlanKey: getPlanSlug(plan), source: String(req.body?.source || 'billing').slice(0, 80) }
        });
        res.status(202).json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, error: 'Unable to record upgrade selection' });
    }
};

exports.getSuperAdminSubscriptionTimeline = async (req, res) => {
    try {
        const result = await listSubscriptionAuditTimeline({ query: req.query });
        res.status(200).json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load subscription timeline' });
    }
};

exports.getSuperAdminSubscriptionAnalytics = async (req, res) => {
    try {
        const result = await listSubscriptionAnalytics({ query: req.query, shopId: req.query.shopId || null });
        res.status(200).json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load subscription analytics' });
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
            PaymentTransaction.find(query)
                .select('+screenshotUrl')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
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

        const requestedPlan = req.body.planName || req.body.planSlug || req.body.plan || shop.plan?.intendedPlanSlug || shop.plan?.name || 'Starter';
        const fallbackPlan = await getPlanBySlugOrNameOrDefault(requestedPlan);
        const planName = fallbackPlan.name || normalizePlanName(requestedPlan);
        const planSlug = fallbackPlan.slug || getPlanSlug(planName);
        const billingCycle = req.body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
        const upgradeIntentToken = String(req.body.upgradeIntentToken || '').trim();
        const upgradeIntent = upgradeIntentToken
            ? await resolveUpgradeIntent({ shopId, token: upgradeIntentToken })
            : null;
        if (upgradeIntentToken && (!upgradeIntent || upgradeIntent.status !== 'active')) {
            return res.status(400).json({
                success: false,
                code: 'UPGRADE_INTENT_INVALID',
                error: 'This upgrade request is invalid or has expired.'
            });
        }
        if (
            upgradeIntent?.recommendedPlan &&
            upgradeIntent.recommendedPlan !== planSlug
        ) {
            return res.status(400).json({
                success: false,
                code: 'UPGRADE_PLAN_MISMATCH',
                error: `This upgrade request is for the ${upgradeIntent.recommendedPlan} plan.`
            });
        }
        const plan = await VendorPlan.findOne({
            isActive: { $ne: false },
            $or: [{ name: planName }, { slug: planSlug }]
        });
        const subscription = await ensureSubscriptionExists(shop);
        const amount = await calculatePlanPrice(plan?._id || planName, billingCycle);
        const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const invoice = await createInvoice({
            shopId,
            subscriptionId: subscription._id,
            planId: plan?._id || null,
            planName,
            planSlug,
            upgradeIntentId: upgradeIntent?.id || null,
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
        const { monthStart, nextMonthStart, offsetMinutes } = getReportingMonthRange();
        const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const [subscriptions, invoices, payments, revenueByPlan, monthlyCollected, monthlyRefunds] = await Promise.all([
            Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
            PaymentTransaction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
            Invoice.aggregate([
                { $match: { status: 'paid', paidAt: { $gte: monthStart, $lt: nextMonthStart } } },
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
            ]),
            Invoice.aggregate([
                { $match: { status: 'paid', paidAt: { $gte: monthStart, $lt: nextMonthStart } } },
                {
                    $group: {
                        _id: null,
                        grossCollected: { $sum: '$amount' },
                        paidInvoiceCount: { $sum: 1 }
                    }
                }
            ]),
            PaymentTransaction.aggregate([
                {
                    $match: {
                        status: 'refunded',
                        updatedAt: { $gte: monthStart, $lt: nextMonthStart }
                    }
                },
                { $group: { _id: null, refunds: { $sum: '$amount' } } }
            ])
        ]);

        const subCount = Object.fromEntries(subscriptions.map(item => [item._id, item.count]));
        const paymentCount = Object.fromEntries(payments.map(item => [item._id, item.count]));
        const grossCollected = Number(monthlyCollected[0]?.grossCollected) || 0;
        const refunds = Number(monthlyRefunds[0]?.refunds) || 0;
        const paidInvoiceCount = Number(monthlyCollected[0]?.paidInvoiceCount) || 0;
        const [trialsEndingSoon, billingSuspended, pendingApprovalSubscriptions] = await Promise.all([
            Subscription.countDocuments({ status: 'trialing', trialEndsAt: { $lte: soon, $gte: new Date() } }),
            Subscription.countDocuments({ status: 'suspended' }),
            Subscription.countDocuments({
                $or: [
                    { paymentReviewStatus: 'pending_approval' },
                    { status: 'pending_approval' }
                ]
            })
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
                    pendingApprovalSubscriptions,
                    trialsEndingSoon,
                    pastDueShops: (subCount.past_due || 0) + (subCount.grace || 0),
                    pendingManualPayments: paymentCount.pending || 0,
                    suspendedForBilling: billingSuspended,
                    revenueThisMonth: grossCollected - refunds,
                    paidInvoicesThisMonth: paidInvoiceCount,
                    grossCollected,
                    refunds,
                    netCollected: grossCollected - refunds
                },
                revenueByPlan,
                reportingPeriod: {
                    monthStart,
                    nextMonthStart,
                    timezoneOffsetMinutes: offsetMinutes
                }
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
            Subscription.find(query)
                .populate('shopId', 'shopName subdomain approvalStatus isActive suspensionReason')
                .populate('planId', 'name slug monthlyPrice yearlyPrice')
                .populate('pendingPlanId', 'name slug monthlyPrice yearlyPrice')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
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
                const safeSubscription = serializeSubscriptionSummary(item, {
                    allowedActions: allowedActionsForSubscription(item)
                });
                const shopId = String(item.shopId?._id || item.shopId || '');
                const billingDisplay = getBillingDisplayForSubscription({
                    subscription: row,
                    activePlan: item.planId && typeof item.planId === 'object' ? item.planId : null,
                    pendingPlan: item.pendingPlanId && typeof item.pendingPlanId === 'object' ? item.pendingPlanId : null
                });
                return {
                    ...safeSubscription,
                    ...row,
                    allowedActions: safeSubscription.allowedActions || [],
                    shop: item.shopId && typeof item.shopId === 'object' ? item.shopId : null,
                    plan: item.planId && typeof item.planId === 'object' ? item.planId : null,
                    pendingPlan: item.pendingPlanId && typeof item.pendingPlanId === 'object' ? item.pendingPlanId : null,
                    billingDisplay,
                    displayPlan: billingDisplay.displayPlan,
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
        const searchRegex = safeSearchRegex(req.query.search);
        if (searchRegex) query.invoiceNumber = searchRegex;

        const [items, total] = await Promise.all([
            Invoice.find(query).populate('shopId', 'shopName subdomain').populate('planId', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Invoice.countDocuments(query)
        ]);
        const payments = await PaymentTransaction.find({
            invoiceId: { $in: items.map(item => item._id) }
        }).select('+screenshotUrl').sort({ createdAt: -1 }).lean();
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
                submittedPayment: serializePaymentSummary(paymentMap[String(item._id)])
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
        const searchRegex = safeSearchRegex(req.query.search);
        if (searchRegex) query.transactionId = searchRegex;

        const [items, total] = await Promise.all([
            PaymentTransaction.find(query)
                .select('+screenshotUrl')
                .populate('shopId', 'shopName subdomain')
                .populate({
                    path: 'invoiceId',
                    select: 'invoiceNumber amount status billingCycle planId planName planSlug',
                    populate: { path: 'planId', select: 'name slug' }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            PaymentTransaction.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: items.map(item => ({
                ...serializePaymentSummary(item),
                shop: item.shopId && typeof item.shopId === 'object' ? item.shopId : null,
                invoice: item.invoiceId && typeof item.invoiceId === 'object' ? item.invoiceId : null
            })),
            pagination: paginationMeta({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
};

exports.getSuperAdminPaymentProof = async (req, res) => {
    try {
        const payment = await PaymentTransaction.findById(req.params.id)
            .select('shopId invoiceId +screenshotUrl');
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        const url = String(payment.screenshotUrl || '').trim();
        if (!/^https:\/\//i.test(url)) {
            return res.status(404).json({ success: false, error: 'Payment proof is not available' });
        }

        const auditIntent = await createAuditIntent({
            audit: {
                req,
                action: 'billing.payment_proof_viewed',
                entityType: 'PaymentTransaction',
                entityId: payment._id,
                shop_id: payment.shopId,
                message: 'Platform billing reviewer opened manual payment proof',
                reason: String(req.query.reason || 'Manual payment verification').slice(0, 300),
                metadata: { invoiceId: payment.invoiceId },
                severity: 'warning'
            }
        });
        try {
            await materializeAuditIntent(auditIntent);
        } catch (auditError) {
            console.error('[Billing] Payment proof audit materialization deferred:', auditError.message);
        }

        res.set('Cache-Control', 'no-store, private');
        res.set('Pragma', 'no-cache');
        return res.status(200).json({
            success: true,
            data: { url }
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            code: err.code || 'PAYMENT_PROOF_ACCESS_FAILED',
            error: err.message || 'Unable to open payment proof'
        });
    }
};

exports.updateSuperAdminSubscriptionStatus = async (req, res) => {
    try {
        const legacyActionMap = {
            active: 'reactivate',
            suspended: 'suspend',
            cancelled: 'cancel'
        };
        const action = legacyActionMap[String(req.body.status || '')];
        if (!action) {
            return res.status(400).json({
                success: false,
                code: 'UNSAFE_GENERIC_STATUS_CHANGE',
                error: 'Use an explicit subscription action. Lifecycle statuses cannot be assigned directly.'
            });
        }

        const updated = await executeSubscriptionAction({
            subscriptionId: req.params.id,
            action,
            reason: req.body.reason,
            expectedVersion: req.body.expectedVersion,
            req
        });
        res.status(200).json({
            success: true,
            data: {
                ...serializeSubscription(updated),
                allowedActions: allowedActionsForSubscription(updated)
            }
        });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'SUBSCRIPTION_ACTION_FAILED',
            error: err.message || 'Failed to update subscription',
            allowedActions: err.allowedActions || undefined
        });
    }
};

exports.executeSuperAdminSubscriptionAction = async (req, res) => {
    try {
        const updated = await executeSubscriptionAction({
            subscriptionId: req.params.id,
            action: req.params.action,
            reason: req.body.reason,
            expectedVersion: req.body.expectedVersion,
            days: req.body.days,
            targetDate: req.body.targetDate,
            req
        });
        res.status(200).json({
            success: true,
            data: {
                ...serializeSubscription(updated),
                allowedActions: allowedActionsForSubscription(updated)
            }
        });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'SUBSCRIPTION_ACTION_FAILED',
            error: err.message || 'Failed to execute subscription action',
            allowedActions: err.allowedActions || undefined
        });
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
            planName: req.body.planName || '',
            planSlug: req.body.planSlug || '',
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
        if (req.body.status !== undefined) {
            return res.status(409).json({
                success: false,
                code: 'INVOICE_STATUS_ACTION_REQUIRED',
                error: 'Invoice status must be changed through the payment approval or rejection workflow.'
            });
        }

        const invoice = await Invoice.findById(req.params.id).select('_id shopId status dueDate notes amount __v');
        if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

        if (['paid', 'rejected', 'cancelled', 'expired'].includes(invoice.status)) {
            return res.status(409).json({
                success: false,
                code: 'INVOICE_FINALIZED',
                error: 'A finalized invoice cannot be edited.'
            });
        }

        const expectedVersion = Number.isInteger(Number(req.body.expectedVersion))
            ? Number(req.body.expectedVersion)
            : Number(invoice.__v || 0);
        const updates = {};
        if (req.body.dueDate !== undefined) {
            const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
            if (dueDate && Number.isNaN(dueDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_DUE_DATE',
                    error: 'A valid due date is required.'
                });
            }
            updates.dueDate = dueDate;
        }
        if (req.body.notes !== undefined) {
            updates.notes = String(req.body.notes || '').trim().slice(0, 1000);
        }
        if (req.body.amount !== undefined) {
            const amount = Number(req.body.amount);
            if (!Number.isFinite(amount) || amount < 0) {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_INVOICE_AMOUNT',
                    error: 'Invoice amount must be a non-negative number.'
                });
            }
            updates.amount = amount;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                code: 'NO_INVOICE_CHANGES',
                error: 'No supported invoice changes were provided.'
            });
        }

        const updatedInvoice = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const updated = await Invoice.findOneAndUpdate(
                    {
                        _id: invoice._id,
                        __v: expectedVersion,
                        status: { $in: ['unpaid', 'submitted'] }
                    },
                    {
                        $set: updates,
                        $inc: { __v: 1 }
                    },
                    { new: true, runValidators: true, session }
                );
                if (!updated) {
                    const conflict = new Error('Invoice changed while you were editing it. Refresh and try again.');
                    conflict.statusCode = 409;
                    conflict.code = 'INVOICE_VERSION_CONFLICT';
                    throw conflict;
                }
                return updated;
            },
            audit: (updated) => ({
                req,
                action: 'billing.invoice_updated',
                entityType: 'Invoice',
                entityId: updated._id,
                shop_id: updated.shopId,
                message: 'Billing invoice updated by a platform administrator',
                metadata: {
                    changedFields: Object.keys(updates),
                    amount: updated.amount,
                    status: updated.status
                }
            })
        });

        res.status(200).json({ success: true, data: serializeInvoice(updatedInvoice) });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'INVOICE_UPDATE_FAILED',
            error: err.message || 'Failed to update invoice'
        });
    }
};

exports.verifySuperAdminPayment = async (req, res) => {
    try {
        const payment = await verifyManualPayment({
            paymentId: req.params.id,
            req,
            adminNote: req.body.adminNote || ''
        });

        res.status(200).json({ success: true, data: serializePaymentSummary(payment) });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'PAYMENT_APPROVAL_FAILED',
            error: err.message || 'Failed to verify payment'
        });
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

        res.status(200).json({ success: true, data: serializePaymentSummary(payment) });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'PAYMENT_REJECTION_FAILED',
            error: err.message || 'Failed to reject payment'
        });
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

// Exported for deterministic reporting-boundary tests; this is not mounted as an API action.
exports.getReportingMonthRange = getReportingMonthRange;
