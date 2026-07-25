const { buildDomainEvent, publish } = require('../events/domainEventBus');

const SUBSCRIPTION_EVENTS = Object.freeze({
    SUBSCRIPTION_CHANGED: 'SubscriptionChanged',
    SUBSCRIPTION_RENEWED: 'SubscriptionRenewed',
    SUBSCRIPTION_EXPIRED: 'SubscriptionExpired',
    SUBSCRIPTION_CANCELLED: 'SubscriptionCancelled',
    TRIAL_STARTED: 'TrialStarted',
    TRIAL_ENDED: 'TrialEnded',
    TRIAL_CONVERTED: 'TrialConverted',
    PLAN_DOWNGRADED: 'PlanDowngraded',
    PLAN_UPGRADED: 'PlanUpgraded',
    FEATURE_BLOCKED: 'FeatureBlocked',
    FEATURE_OVERRIDE_CHANGED: 'FeatureOverrideChanged',
    QUOTA_LIMIT_CHANGED: 'QuotaLimitChanged',
    QUOTA_REACHED: 'QuotaReached',
    QUOTA_WARNING: 'QuotaWarning',
    USAGE_CHANGED: 'UsageChanged',
    UPGRADE_CLICKED: 'UpgradeClicked',
    UPGRADE_PROMPT_VIEWED: 'UpgradePromptViewed',
    UPGRADE_PROMPT_DISMISSED: 'UpgradePromptDismissed',
    GROWTH_MILESTONE: 'GrowthMilestone'
});

const actorFromRequest = (req) => ({
    id: req?.user?.accountId || req?.user?.account_id || req?.user?._id || req?.user?.id || null,
    model: req?.user?.accountId || req?.user?.account_id ? 'Account' : 'User',
    name: req?.user?.fullName || '',
    email: req?.user?.email || '',
    role: req?.user?.role || 'System'
});

const requestContext = (req) => ({
    requestId: req?.requestId || req?.id || req?.get?.('x-request-id') || '',
    ip: req?.ip || '',
    userAgent: req?.get ? req.get('user-agent') || '' : ''
});

const emitSubscriptionEvent = async (type, payload = {}, options = {}) => {
    const req = payload.req || null;
    const event = buildDomainEvent(type, {
        ...payload,
        req: undefined,
        shopId: payload.shopId || payload.tenantId || null,
        tenantId: payload.tenantId || payload.shopId || null,
        actor: payload.actor || actorFromRequest(req),
        request: payload.request || requestContext(req)
    });
    return publish(event, options);
};

module.exports = {
    SUBSCRIPTION_EVENTS,
    emitSubscriptionEvent,
    actorFromRequest,
    requestContext
};
