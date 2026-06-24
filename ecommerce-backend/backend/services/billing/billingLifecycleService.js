const Subscription = require('../../models/Subscription');
const {
    addDays,
    markPastDue,
    enterGracePeriod,
    suspendForBilling,
    BILLING_SUSPENSION_REASON
} = require('./subscriptionService');

const findTrialsEndingSoon = (now = new Date()) => {
    const soon = addDays(now, 3);
    return Subscription.find({
        status: 'trialing',
        trialEndsAt: { $gt: now, $lte: soon }
    });
};

const findExpiredTrials = (now = new Date()) => Subscription.find({
    status: 'trialing',
    trialEndsAt: { $lte: now }
});

const findPastDueSubscriptions = (now = new Date()) => Subscription.find({
    status: 'past_due',
    graceEndsAt: { $lte: now }
});

const findGraceExpiredSubscriptions = (now = new Date()) => Subscription.find({
    status: 'grace',
    graceEndsAt: { $lte: now }
});

const runBillingLifecycleCheck = async ({ req = null, now = new Date() } = {}) => {
    const expiredTrials = await findExpiredTrials(now);
    const pastDue = await findPastDueSubscriptions(now);
    const graceExpired = await findGraceExpiredSubscriptions(now);

    const movedToGrace = [];
    const suspended = [];

    for (const subscription of expiredTrials) {
        movedToGrace.push(await enterGracePeriod(subscription, { now }));
    }

    for (const subscription of pastDue) {
        suspended.push(await suspendForBilling(subscription, {
            req,
            now,
            reason: BILLING_SUSPENSION_REASON
        }));
    }

    for (const subscription of graceExpired) {
        suspended.push(await suspendForBilling(subscription, {
            req,
            now,
            reason: BILLING_SUSPENSION_REASON
        }));
    }

    return {
        movedToGrace: movedToGrace.length,
        suspended: suspended.length
    };
};

module.exports = {
    findTrialsEndingSoon,
    findExpiredTrials,
    findPastDueSubscriptions,
    findGraceExpiredSubscriptions,
    runBillingLifecycleCheck
};
