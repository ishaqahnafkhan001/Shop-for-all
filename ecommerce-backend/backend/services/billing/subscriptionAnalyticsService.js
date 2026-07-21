const SubscriptionAnalyticsEvent = require('../../models/SubscriptionAnalyticsEvent');
const { buildPagination } = require('../../utils/pagination');

const EVENT_TYPE_MAP = Object.freeze({
    SubscriptionChanged: 'subscription_changed',
    SubscriptionRenewed: 'subscription_renewed',
    SubscriptionExpired: 'subscription_expired',
    SubscriptionCancelled: 'subscription_cancelled',
    TrialStarted: 'trial_started',
    TrialEnded: 'trial_ended',
    TrialConverted: 'trial_converted',
    PlanDowngraded: 'downgrade',
    PlanUpgraded: 'upgrade_successful',
    FeatureBlocked: 'feature_blocked',
    QuotaReached: 'quota_reached',
    QuotaWarning: 'quota_warning',
    UpgradeClicked: 'upgrade_clicked'
});

const resolveAnalyticsType = (event) => {
    if (event.type === 'UsageChanged') {
        const action = event.metadata?.action;
        if (action === 'ai_generation') return 'ai_generation';
        if (action === 'product_created') return 'product_created';
        if (action === 'staff_added') return 'staff_added';
        return 'usage_changed';
    }
    return EVENT_TYPE_MAP[event.type] || String(event.type || 'subscription_event').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
};

const recordSubscriptionAnalyticsEvent = async (event) => {
    if (!event?.shopId) return null;
    return SubscriptionAnalyticsEvent.create({
        eventId: event.eventId,
        tenantId: event.tenantId || event.shopId,
        shopId: event.shopId,
        planKey: event.planKey || event.metadata?.planKey || 'starter',
        eventType: resolveAnalyticsType(event),
        domainEventType: event.type,
        actorId: event.actor?.id || null,
        correlationId: event.correlationId,
        metadata: event.metadata || {},
        occurredAt: event.occurredAt
    });
};

const listSubscriptionAnalytics = async ({ query = {}, shopId = null } = {}) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (query.eventType) filter.eventType = String(query.eventType).slice(0, 100);
    if (query.planKey) filter.planKey = String(query.planKey).toLowerCase().slice(0, 40);
    const [data, total] = await Promise.all([
        SubscriptionAnalyticsEvent.find(filter).sort({ occurredAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        SubscriptionAnalyticsEvent.countDocuments(filter)
    ]);
    return { data, pagination: buildPagination({ total, page, limit }) };
};

module.exports = {
    EVENT_TYPE_MAP,
    resolveAnalyticsType,
    recordSubscriptionAnalyticsEvent,
    listSubscriptionAnalytics
};
