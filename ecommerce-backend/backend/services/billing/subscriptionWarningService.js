const SubscriptionUsageWarning = require('../../models/SubscriptionUsageWarning');
const { getUsageWarningThresholds } = require('../../config/subscriptionUsage');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('./subscriptionEvents');

const RESOURCE_LABELS = {
    products: 'products',
    staff: 'staff accounts',
    aiGeneration: 'AI generations'
};

const warningScopeKey = ({ resource, planKey, metric }) => {
    if (resource === 'aiGeneration') return `${planKey}:${metric.resetsAt || 'current-week'}:${metric.limit}`;
    return `${planKey}:${metric.limit}`;
};

const getCurrentUsageWarnings = ({ planKey, usage }) => {
    const thresholds = getUsageWarningThresholds();
    return ['products', 'staff', 'aiGeneration'].flatMap(resource => {
        const metric = usage?.[resource];
        if (!metric || metric.limit === null || Number(metric.limit) <= 0) return [];
        const percentage = Math.min(100, Math.floor((Number(metric.used || 0) / Number(metric.limit)) * 100));
        const reached = thresholds.filter(threshold => percentage >= threshold);
        if (!reached.length) return [];
        const threshold = reached[reached.length - 1];
        return [{
            resource,
            threshold,
            percentage,
            severity: threshold >= 100 ? 'critical' : threshold >= 90 ? 'warning' : 'info',
            message: `${metric.used}/${metric.limit} ${RESOURCE_LABELS[resource]} used.`,
            usage: metric,
            planKey
        }];
    });
};

const evaluateUsageWarnings = async ({ shopId, planKey, usage, req = null }) => {
    const currentWarnings = getCurrentUsageWarnings({ planKey, usage });
    const thresholds = getUsageWarningThresholds();

    for (const resource of ['products', 'staff', 'aiGeneration']) {
        const metric = usage?.[resource];
        if (!metric || metric.limit === null || Number(metric.limit) <= 0) continue;
        const percentage = Math.min(100, Math.floor((Number(metric.used || 0) / Number(metric.limit)) * 100));
        await SubscriptionUsageWarning.deleteMany({
            shopId,
            resource,
            scopeKey: warningScopeKey({ resource, planKey, metric }),
            threshold: { $gt: percentage }
        });
    }

    for (const warning of currentWarnings) {
        const metric = usage[warning.resource];
        const reachedThresholds = thresholds.filter(threshold => warning.percentage >= threshold);
        for (const threshold of reachedThresholds) {
            const eventType = threshold >= 100 ? SUBSCRIPTION_EVENTS.QUOTA_REACHED : SUBSCRIPTION_EVENTS.QUOTA_WARNING;
            let created;
            try {
                created = await SubscriptionUsageWarning.create({
                    shopId,
                    resource: warning.resource,
                    scopeKey: warningScopeKey({ resource: warning.resource, planKey, metric }),
                    threshold,
                    used: metric.used,
                    limit: metric.limit,
                    eventType
                });
            } catch (error) {
                if (error?.code === 11000) continue;
                throw error;
            }

            await emitSubscriptionEvent(eventType, {
                req,
                shopId,
                planKey,
                affectedResources: [warning.resource],
                metadata: {
                    resource: warning.resource,
                    threshold,
                    usage: metric,
                    warningId: created._id
                }
            });
        }
    }

    return currentWarnings;
};

module.exports = {
    RESOURCE_LABELS,
    warningScopeKey,
    getCurrentUsageWarnings,
    evaluateUsageWarnings
};
