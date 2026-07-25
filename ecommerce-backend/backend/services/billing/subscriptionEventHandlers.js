const cache = require('../cacheService');
const { subscribe } = require('../events/domainEventBus');
const { createNotification } = require('../notificationService');
const { reconcileShopPlan } = require('./subscriptionReconciliationService');
const { getSubscriptionUsage } = require('./subscriptionUsageService');
const { evaluateUsageWarnings } = require('./subscriptionWarningService');
const { recordSubscriptionAnalyticsEvent } = require('./subscriptionAnalyticsService');
const { recordSubscriptionAuditEvent } = require('./subscriptionAuditService');
const { SUBSCRIPTION_EVENTS } = require('./subscriptionEvents');
const { hasFeature } = require('../shops/featureAccessService');

let initialized = false;

const lifecycleEvents = [
    SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED,
    SUBSCRIPTION_EVENTS.SUBSCRIPTION_RENEWED,
    SUBSCRIPTION_EVENTS.SUBSCRIPTION_EXPIRED,
    SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED,
    SUBSCRIPTION_EVENTS.TRIAL_STARTED,
    SUBSCRIPTION_EVENTS.TRIAL_ENDED,
    SUBSCRIPTION_EVENTS.TRIAL_CONVERTED,
    SUBSCRIPTION_EVENTS.PLAN_DOWNGRADED,
    SUBSCRIPTION_EVENTS.PLAN_UPGRADED,
    SUBSCRIPTION_EVENTS.FEATURE_OVERRIDE_CHANGED,
    SUBSCRIPTION_EVENTS.QUOTA_LIMIT_CHANGED
];

const reconciliationEvents = [
    SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED,
    SUBSCRIPTION_EVENTS.PLAN_DOWNGRADED,
    SUBSCRIPTION_EVENTS.PLAN_UPGRADED,
    SUBSCRIPTION_EVENTS.TRIAL_CONVERTED,
    SUBSCRIPTION_EVENTS.QUOTA_LIMIT_CHANGED
];

const notificationContent = (event) => {
    if (event.type === SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED && event.metadata?.billingSuspension) {
        return {
            title: 'Store restricted for billing',
            message: 'Operational features are restricted until the billing issue is resolved. Billing, settings, and support remain available.',
            severity: 'critical'
        };
    }
    if ([SUBSCRIPTION_EVENTS.QUOTA_WARNING, SUBSCRIPTION_EVENTS.QUOTA_REACHED].includes(event.type)) {
        const usage = event.metadata?.usage || {};
        const resource = event.metadata?.resource || 'plan capacity';
        return {
            title: event.type === SUBSCRIPTION_EVENTS.QUOTA_REACHED ? 'Plan limit reached' : 'Plan usage warning',
            message: `${usage.used || 0}/${usage.limit || 0} ${resource} used.`,
            severity: event.type === SUBSCRIPTION_EVENTS.QUOTA_REACHED ? 'critical' : 'warning'
        };
    }
    if ([SUBSCRIPTION_EVENTS.PLAN_UPGRADED, SUBSCRIPTION_EVENTS.PLAN_DOWNGRADED].includes(event.type)) {
        return {
            title: `Plan changed to ${event.newValue?.planName || event.metadata?.newPlanName || 'your new plan'}`,
            message: 'Your plan entitlements and usage limits have been updated. Review Plan & Usage for details.',
            severity: 'info'
        };
    }
    if (event.type === SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED) {
        return {
            title: 'Subscription status updated',
            message: 'Your subscription status has changed. Review Plan & Usage for details.',
            severity: 'info'
        };
    }
    if (event.type === SUBSCRIPTION_EVENTS.TRIAL_STARTED) {
        const planName = event.newValue?.planName || event.metadata?.planName || 'selected';
        return { title: 'Free trial started', message: `Your 14-day ${planName} trial is active.`, severity: 'success' };
    }
    if (event.type === SUBSCRIPTION_EVENTS.TRIAL_CONVERTED) {
        return { title: 'Subscription activated', message: 'Your trial has been converted to an active subscription.', severity: 'success' };
    }
    if (event.type === SUBSCRIPTION_EVENTS.SUBSCRIPTION_RENEWED) {
        return { title: 'Subscription renewed', message: 'Your subscription period has been renewed.', severity: 'success' };
    }
    if (event.type === SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED) {
        return { title: 'Subscription cancelled', message: 'Your subscription has been cancelled. Your store data remains preserved.', severity: 'warning' };
    }
    if (event.type === SUBSCRIPTION_EVENTS.SUBSCRIPTION_EXPIRED || event.type === SUBSCRIPTION_EVENTS.TRIAL_ENDED) {
        return { title: 'Subscription needs attention', message: 'Your trial or subscription period has ended.', severity: 'warning' };
    }
    return null;
};

const initializeSubscriptionEventHandlers = () => {
    if (initialized) return;
    initialized = true;

    subscribe({
        eventTypes: reconciliationEvents,
        name: 'subscription.reconciliation',
        priority: 10,
        handler: async event => {
            if (event.metadata?.reconciliationSummary) {
                return event.metadata.reconciliationSummary;
            }
            const planKey = event.newValue?.planKey || event.metadata?.newPlanKey || event.planKey;
            if (!event.shopId || !planKey) return null;
            return reconcileShopPlan({ shopId: event.shopId, planKey });
        }
    });

    subscribe({
        eventTypes: lifecycleEvents,
        name: 'subscription.cache-invalidation',
        priority: 20,
        handler: async event => {
            if (!event.shopId) return null;
            await Promise.all([
                cache.delPattern(`storefront:*:${event.shopId}:*`),
                cache.del(`subscription:usage:${event.shopId}`)
            ]);
            return { invalidated: true };
        }
    });

    subscribe({
        eventTypes: SUBSCRIPTION_EVENTS.USAGE_CHANGED,
        name: 'subscription.usage-warning-evaluation',
        priority: 30,
        handler: async event => {
            if (!event.shopId) return null;
            const usagePayload = await getSubscriptionUsage(event.shopId);
            return evaluateUsageWarnings({
                shopId: event.shopId,
                planKey: usagePayload.planKey,
                usage: usagePayload.usage
            });
        }
    });

    subscribe({
        eventTypes: '*',
        name: 'subscription.analytics',
        priority: 80,
        handler: recordSubscriptionAnalyticsEvent
    });

    subscribe({
        eventTypes: '*',
        name: 'subscription.audit',
        priority: 90,
        handler: recordSubscriptionAuditEvent
    });

    subscribe({
        eventTypes: [
            SUBSCRIPTION_EVENTS.QUOTA_WARNING,
            SUBSCRIPTION_EVENTS.QUOTA_REACHED,
            SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED,
            SUBSCRIPTION_EVENTS.SUBSCRIPTION_RENEWED,
            SUBSCRIPTION_EVENTS.SUBSCRIPTION_EXPIRED,
            SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED,
            SUBSCRIPTION_EVENTS.TRIAL_STARTED,
            SUBSCRIPTION_EVENTS.TRIAL_ENDED,
            SUBSCRIPTION_EVENTS.TRIAL_CONVERTED,
            SUBSCRIPTION_EVENTS.PLAN_DOWNGRADED,
            SUBSCRIPTION_EVENTS.PLAN_UPGRADED
        ],
        name: 'subscription.vendor-notification',
        priority: 100,
        handler: async event => {
            if (event.metadata?.notifyVendor === false) return null;
            const content = notificationContent(event);
            if (!content || !event.shopId) return null;
            if (!(await hasFeature(event.shopId, 'notifications'))) return null;
            return createNotification({
                shop_id: event.shopId,
                type: 'system',
                title: content.title,
                message: content.message,
                entityType: 'Subscription',
                entityId: event.subscriptionId || null,
                severity: content.severity,
                metadata: {
                    domainEventType: event.type,
                    correlationId: event.correlationId,
                    ...(event.metadata || {})
                }
            });
        }
    });
};

module.exports = {
    lifecycleEvents,
    reconciliationEvents,
    initializeSubscriptionEventHandlers
};
