const crypto = require('crypto');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Shop = require('../../models/Shop');
const UpgradePromptState = require('../../models/UpgradePromptState');
const UpgradeIntent = require('../../models/UpgradeIntent');
const {
    getShopPlanAccess,
    getLowestEligiblePlan,
    getLowestEligiblePlanForLimit
} = require('./planAccessService');
const { getSubscriptionUsage } = require('./subscriptionUsageService');
const { getFeatureDefinition } = require('../../config/subscriptionFeatures');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('./subscriptionEvents');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COOLDOWN_DAYS = 7;
const INTERNAL_RETURN_PATHS = Object.freeze([
    '/dashboard',
    '/dashboard/overview',
    '/dashboard/products',
    '/dashboard/billing',
    '/dashboard/settings'
]);

const policyNumber = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const getConversionPolicy = () => ({
    productSoftWarningAt: policyNumber('BEGINNER_PRODUCT_SOFT_WARNING_AT', 20),
    productProminentWarningAt: policyNumber('BEGINNER_PRODUCT_PROMINENT_WARNING_AT', 23),
    completedOrderMilestone: policyNumber('BEGINNER_ORDER_MILESTONE', 10),
    cooldownDays: policyNumber('BEGINNER_UPGRADE_PROMPT_COOLDOWN_DAYS', DEFAULT_COOLDOWN_DAYS)
});

const normalizeReturnTo = (value) => {
    const candidate = String(value || '/dashboard/billing').trim();
    if (!candidate.startsWith('/') || candidate.startsWith('//')) return '/dashboard/billing';
    try {
        const parsed = new URL(candidate, 'https://scaleup.invalid');
        const allowed = INTERNAL_RETURN_PATHS.some(path => (
            parsed.pathname === path || parsed.pathname.startsWith(`${path}/`)
        ));
        return allowed ? `${parsed.pathname}${parsed.search}${parsed.hash}` : '/dashboard/billing';
    } catch {
        return '/dashboard/billing';
    }
};

const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');

const getRecommendedPlan = async ({ access, capability }) => (
    getLowestEligiblePlan(access.plan, capability)
);

const buildUpgrade = async ({
    access,
    capability = '',
    limitKey = '',
    currentLimit = null,
    reason = ''
}) => {
    const definition = capability ? getFeatureDefinition(capability) : null;
    const recommendedPlan = limitKey
        ? await getLowestEligiblePlanForLimit(access.plan, limitKey, currentLimit)
        : capability
            ? await getRecommendedPlan({ access, capability })
            : null;
    return {
        recommendedPlan,
        capability: capability || '',
        limitKey: limitKey || '',
        reason: reason || definition?.upgradeReason || 'Unlock more room and tools as your store grows.'
    };
};

const getPromptState = async ({ shopId, category, milestoneKey = '' }) => (
    UpgradePromptState.findOne({ shopId, category, milestoneKey }).lean()
);

const isPromptAvailable = ({ state, now, blocking = false, once = false, cooldownDays }) => {
    if (blocking) return true;
    if (once && state?.completedAt) return false;
    if (state?.dismissedUntil && new Date(state.dismissedUntil) > now) return false;
    if (state?.lastShownAt) {
        const nextAt = new Date(state.lastShownAt).getTime() + cooldownDays * DAY_MS;
        if (nextAt > now.getTime()) return false;
    }
    return true;
};

const recordPromptView = async ({ shopId, category, milestoneKey = '', once = false, req, metadata }) => {
    const now = new Date();
    await UpgradePromptState.findOneAndUpdate(
        { shopId, category, milestoneKey },
        {
            $set: {
                lastShownAt: now,
                ...(once ? { completedAt: now } : {})
            },
            $inc: { shownCount: 1 },
            $setOnInsert: { dismissedUntil: null }
        },
        { upsert: true }
    );
    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.UPGRADE_PROMPT_VIEWED, {
        req,
        shopId,
        planKey: 'beginner',
        metadata: {
            promptCategory: category,
            milestone: milestoneKey || undefined,
            ...(metadata || {}),
            notifyVendor: false
        }
    });
};

const selectBeginnerPrompt = async ({ shopId, surface = 'overview', req = null }) => {
    const access = await getShopPlanAccess(shopId);
    if (access.planKey !== 'beginner') {
        return { planKey: access.planKey, prompt: null };
    }

    const now = new Date();
    const policy = getConversionPolicy();
    const [usagePayload, shop, completedOrders, outOfStockProduct] = await Promise.all([
        getSubscriptionUsage(shopId, { access }),
        Shop.findById(shopId)
            .select('verification.status verification.deadline plan.status suspensionReason')
            .lean(),
        Order.countDocuments({
            shop_id: shopId,
            status: { $in: ['Delivered', 'Completed'] }
        }),
        Product.exists({
            shop_id: shopId,
            isDeleted: { $ne: true },
            status: { $ne: 'Archived' },
            variants: { $not: { $elemMatch: { stock: { $gt: 0 } } } }
        })
    ]);
    const usedProducts = usagePayload.usage.products.used;
    const productLimit = usagePayload.usage.products.limit;
    const candidates = [];

    if (shop?.verification?.status !== 'approved') {
        candidates.push({
            priority: 1,
            category: 'verification',
            kind: 'compliance',
            title: 'Complete store verification',
            message: 'Verify the owner identity and phone to keep your store active.',
            actionLabel: 'Continue verification',
            actionPath: '/dashboard/verification',
            blocking: true
        });
    } else if (!['Active', 'Trialing'].includes(shop?.plan?.status)) {
        candidates.push({
            priority: 2,
            category: 'billing',
            kind: 'billing',
            title: 'Billing needs attention',
            message: 'Review your billing status to keep essential store operations available.',
            actionLabel: 'Review billing',
            actionPath: '/dashboard/billing',
            blocking: true
        });
    }

    if (productLimit !== null && usedProducts >= productLimit) {
        candidates.push({
            priority: 3,
            category: 'product_quota',
            kind: 'quota',
            title: `Products used: ${usedProducts} of ${productLimit}`,
            message: `You have reached the Beginner limit of ${productLimit} products. Upgrade to add more products without removing your existing catalogue.`,
            usage: usagePayload.usage.products,
            upgrade: await buildUpgrade({
                access,
                limitKey: 'productCount',
                currentLimit: productLimit,
                reason: 'Add more products and expand your catalogue.'
            }),
            blocking: true
        });
    } else if (usedProducts >= policy.productProminentWarningAt) {
        candidates.push({
            priority: 4,
            category: 'product_growth_prominent',
            kind: 'growth',
            title: `Products used: ${usedProducts} of ${productLimit}`,
            message: `You have ${Math.max(0, productLimit - usedProducts)} product slots left. A higher plan gives your growing catalogue more room.`,
            usage: usagePayload.usage.products,
            upgrade: await buildUpgrade({
                access,
                limitKey: 'productCount',
                currentLimit: productLimit
            })
        });
    } else if (usedProducts >= policy.productSoftWarningAt) {
        candidates.push({
            priority: 5,
            category: 'product_growth_soft',
            kind: 'growth',
            title: `Products used: ${usedProducts} of ${productLimit}`,
            message: 'Your catalogue is growing. Explore plans with more product capacity and growth tools.',
            usage: usagePayload.usage.products,
            upgrade: await buildUpgrade({
                access,
                limitKey: 'productCount',
                currentLimit: productLimit
            })
        });
    }

    if (completedOrders >= policy.completedOrderMilestone) {
        candidates.push({
            priority: 6,
            category: 'order_milestone',
            milestoneKey: `completed_orders_${policy.completedOrderMilestone}`,
            kind: 'milestone',
            title: `${completedOrders} completed orders`,
            message: 'Your store is growing. Unlock sales insights to understand trends and popular products.',
            upgrade: await buildUpgrade({ access, capability: 'analytics' }),
            once: true
        });
    } else if (completedOrders === 1) {
        candidates.push({
            priority: 6,
            category: 'first_completed_order',
            milestoneKey: 'first_completed_order',
            kind: 'celebration',
            title: 'Your first order is complete',
            message: 'Congratulations. Your store is officially selling online.',
            once: true
        });
    }

    if (outOfStockProduct) {
        candidates.push({
            priority: 7,
            category: 'first_out_of_stock',
            milestoneKey: 'first_out_of_stock',
            kind: 'growth',
            title: 'A product is out of stock',
            message: 'Higher plans can alert you before inventory runs out.',
            upgrade: await buildUpgrade({ access, capability: 'lowStockAlerts' }),
            once: true
        });
    }

    if (surface === 'settings') {
        candidates.push({
            priority: 8,
            category: 'storefront_customization',
            kind: 'discovery',
            title: 'Your store uses the Beginner layout',
            message: 'Upgrade to an eligible plan to customize sections, branding, colors, fonts, and navigation.',
            upgrade: await buildUpgrade({ access, capability: 'storeBuilder' })
        });
    }

    candidates.sort((left, right) => left.priority - right.priority);
    for (const prompt of candidates) {
        const state = await getPromptState({
            shopId,
            category: prompt.category,
            milestoneKey: prompt.milestoneKey || ''
        });
        if (!isPromptAvailable({
            state,
            now,
            blocking: prompt.blocking,
            once: prompt.once,
            cooldownDays: policy.cooldownDays
        })) continue;

        await recordPromptView({
            shopId,
            category: prompt.category,
            milestoneKey: prompt.milestoneKey || '',
            once: prompt.once,
            req,
            metadata: {
                page: surface,
                currentUsage: prompt.usage?.used,
                currentLimit: prompt.usage?.limit,
                recommendedPlan: prompt.upgrade?.recommendedPlan,
                capability: prompt.upgrade?.capability
            }
        });
        return {
            planKey: access.planKey,
            policy,
            prompt: {
                ...prompt,
                priority: undefined,
                once: undefined,
                blocking: Boolean(prompt.blocking)
            }
        };
    }

    return { planKey: access.planKey, policy, prompt: null };
};

const dismissPrompt = async ({ shopId, category, milestoneKey = '', req = null }) => {
    const policy = getConversionPolicy();
    const dismissedUntil = new Date(Date.now() + policy.cooldownDays * DAY_MS);
    await UpgradePromptState.findOneAndUpdate(
        { shopId, category: String(category || '').slice(0, 80), milestoneKey: String(milestoneKey || '').slice(0, 120) },
        { $set: { dismissedUntil }, $setOnInsert: { shownCount: 0 } },
        { upsert: true }
    );
    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.UPGRADE_PROMPT_DISMISSED, {
        req,
        shopId,
        planKey: 'beginner',
        metadata: {
            promptCategory: category,
            milestone: milestoneKey || undefined,
            dismissedUntil,
            notifyVendor: false
        }
    });
    return { dismissedUntil };
};

const createUpgradeIntent = async ({
    shopId,
    userId = null,
    capability = '',
    limitKey = '',
    returnTo = '/dashboard/billing',
    req = null
}) => {
    const access = await getShopPlanAccess(shopId);
    const currentLimit = limitKey ? access.limits?.[limitKey] ?? null : null;
    const recommendedPlan = limitKey
        ? await getLowestEligiblePlanForLimit(access.plan, limitKey, currentLimit)
        : capability
            ? await getLowestEligiblePlan(access.plan, capability)
            : null;
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await UpgradeIntent.create({
        shopId,
        createdBy: userId,
        tokenHash: hashToken(token),
        capability: String(capability || '').slice(0, 80),
        limitKey,
        recommendedPlan: recommendedPlan || '',
        returnTo: normalizeReturnTo(returnTo),
        expiresAt
    });
    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.UPGRADE_CLICKED, {
        req,
        shopId,
        planKey: access.planKey,
        metadata: {
            capability: capability || undefined,
            limitKey: limitKey || undefined,
            recommendedPlan: recommendedPlan || undefined,
            page: normalizeReturnTo(returnTo),
            notifyVendor: false
        }
    });
    return {
        token,
        expiresAt,
        recommendedPlan,
        returnTo: normalizeReturnTo(returnTo)
    };
};

const resolveUpgradeIntent = async ({ shopId, token }) => {
    const intent = await UpgradeIntent.findOne({
        shopId,
        tokenHash: hashToken(token),
        status: { $in: ['active', 'completed'] },
        expiresAt: { $gt: new Date() }
    }).lean();
    if (!intent) return null;
    return {
        id: intent._id,
        capability: intent.capability,
        limitKey: intent.limitKey,
        recommendedPlan: intent.recommendedPlan,
        returnTo: intent.returnTo,
        expiresAt: intent.expiresAt,
        status: intent.status
    };
};

module.exports = {
    INTERNAL_RETURN_PATHS,
    getConversionPolicy,
    normalizeReturnTo,
    selectBeginnerPrompt,
    dismissPrompt,
    createUpgradeIntent,
    resolveUpgradeIntent
};
