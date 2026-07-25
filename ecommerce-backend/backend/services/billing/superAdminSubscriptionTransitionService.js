const Shop = require('../../models/Shop');
const Subscription = require('../../models/Subscription');
const { isVerificationSuspension } = require('../vendorVerificationService');
const { runCriticalGovernanceAction } = require('../platformAuditOutboxService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('./subscriptionEvents');

const ACTIONS = Object.freeze({
    reactivate: 'reactivate',
    suspend: 'suspend',
    cancel: 'cancel',
    extend: 'extend'
});

const transitionError = (code, message, statusCode = 409, details = {}) => {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    Object.assign(error, details);
    return error;
};

const allowedActionsForSubscription = (subscription) => {
    const status = String(subscription?.status || '');
    const actions = [];
    if (status === 'suspended') actions.push(ACTIONS.reactivate, ACTIONS.cancel);
    if (['active', 'trialing', 'past_due', 'grace'].includes(status)) {
        actions.push(ACTIONS.suspend, ACTIONS.cancel);
    }
    if (['active', 'grace'].includes(status)) actions.push(ACTIONS.extend);
    return [...new Set(actions)];
};

const assertActionAllowed = (subscription, action) => {
    if (!Object.values(ACTIONS).includes(action)) {
        throw transitionError('UNKNOWN_SUBSCRIPTION_ACTION', 'Unknown subscription action.', 400);
    }
    const allowedActions = allowedActionsForSubscription(subscription);
    if (!allowedActions.includes(action)) {
        throw transitionError(
            'INVALID_SUBSCRIPTION_TRANSITION',
            `${action} is not allowed while the subscription is ${subscription.status}.`,
            409,
            { allowedActions }
        );
    }
};

const resolveExtensionEnd = ({ subscription, days, targetDate, now }) => {
    const currentEnd = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : new Date(now);
    let nextEnd;
    if (targetDate) {
        nextEnd = new Date(targetDate);
    } else {
        const extensionDays = Number(days);
        if (!Number.isInteger(extensionDays) || extensionDays < 1 || extensionDays > 365) {
            throw transitionError(
                'INVALID_EXTENSION',
                'Extension days must be an integer between 1 and 365.',
                400
            );
        }
        nextEnd = new Date(currentEnd);
        nextEnd.setUTCDate(nextEnd.getUTCDate() + extensionDays);
    }

    if (Number.isNaN(nextEnd.getTime()) || nextEnd.getTime() <= currentEnd.getTime()) {
        throw transitionError(
            'INVALID_EXTENSION',
            'The new period end must be later than the current period end.',
            400
        );
    }
    return nextEnd;
};

const executeSubscriptionAction = async ({
    subscriptionId,
    action,
    reason = '',
    expectedVersion,
    days,
    targetDate,
    req = null,
    now = new Date()
}) => {
    const current = await Subscription.findById(subscriptionId);
    if (!current) throw transitionError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found.', 404);
    assertActionAllowed(current, action);

    const cleanReason = String(reason || '').trim();
    if ([ACTIONS.suspend, ACTIONS.cancel, ACTIONS.extend].includes(action) && !cleanReason) {
        throw transitionError('REASON_REQUIRED', `A reason is required to ${action} a subscription.`, 400);
    }
    if (expectedVersion !== undefined && Number(expectedVersion) !== Number(current.__v || 0)) {
        throw transitionError('STALE_SUBSCRIPTION', 'The subscription changed. Reload and try again.', 409);
    }

    const before = {
        status: current.status,
        currentPeriodStart: current.currentPeriodStart || null,
        currentPeriodEnd: current.currentPeriodEnd || null,
        suspensionReason: current.suspensionReason || ''
    };
    const nextPeriodEnd = action === ACTIONS.extend
        ? resolveExtensionEnd({ subscription: current, days, targetDate, now })
        : current.currentPeriodEnd;

    const updated = await runCriticalGovernanceAction({
        mutate: async (session) => {
            const query = {
                _id: current._id,
                status: current.status,
                __v: current.__v
            };
            const set = {};
            const unset = {};

            if (action === ACTIONS.reactivate) {
                if (current.currentPeriodEnd && new Date(current.currentPeriodEnd).getTime() <= now.getTime()) {
                    throw transitionError(
                        'SUBSCRIPTION_PERIOD_EXPIRED',
                        'This paid period has expired. Use renewal or an explicit extension.',
                        409
                    );
                }
                set.status = 'active';
                set.suspensionReason = '';
                unset.suspendedAt = 1;
            } else if (action === ACTIONS.suspend) {
                set.status = 'suspended';
                set.suspendedAt = now;
                set.suspensionReason = cleanReason;
            } else if (action === ACTIONS.cancel) {
                set.status = 'cancelled';
                set.cancelledAt = now;
            } else if (action === ACTIONS.extend) {
                set.status = 'active';
                set.currentPeriodEnd = nextPeriodEnd;
                set.suspensionReason = '';
                unset.suspendedAt = 1;
                unset.graceEndsAt = 1;
            }

            const subscription = await Subscription.findOneAndUpdate(
                query,
                {
                    $set: set,
                    ...(Object.keys(unset).length ? { $unset: unset } : {}),
                    $inc: { entitlementVersion: 1, __v: 1 }
                },
                { new: true, runValidators: true, session }
            );
            if (!subscription) {
                throw transitionError(
                    'SUBSCRIPTION_TRANSITION_CONFLICT',
                    'Another administrator changed this subscription. Reload and try again.',
                    409
                );
            }

            const shop = await Shop.findById(subscription.shopId).session(session);
            if (shop && action === ACTIONS.suspend && !isVerificationSuspension(shop)) {
                shop.approvalStatus = 'Suspended';
                shop.isActive = false;
                shop.suspensionReason = cleanReason;
                await shop.save({ session });
            }
            if (shop && [ACTIONS.reactivate, ACTIONS.extend].includes(action) && !isVerificationSuspension(shop)) {
                shop.approvalStatus = 'Approved';
                shop.isActive = true;
                shop.suspensionReason = '';
                await shop.save({ session });
            }

            return subscription;
        },
        audit: (subscription) => ({
            req,
            action: `billing.subscription_${action}`,
            entityType: 'Subscription',
            entityId: subscription._id,
            shop_id: subscription.shopId,
            message: `Subscription ${action} completed`,
            reason: cleanReason,
            severity: action === ACTIONS.suspend || action === ACTIONS.cancel ? 'warning' : 'info',
            metadata: {
                previousStatus: before.status,
                newStatus: subscription.status,
                previousPeriodEnd: before.currentPeriodEnd,
                newPeriodEnd: subscription.currentPeriodEnd || null
            }
        })
    });

    await emitSubscriptionEvent(
        action === ACTIONS.cancel
            ? SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED
            : SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED,
        {
            req,
            shopId: updated.shopId,
            subscriptionId: updated._id,
            planKey: updated.activePlanSlug,
            oldValue: before,
            newValue: {
                status: updated.status,
                currentPeriodEnd: updated.currentPeriodEnd || null
            },
            reason: cleanReason,
            affectedResources: ['subscription', 'shop', 'features']
        }
    );

    return updated;
};

module.exports = {
    ACTIONS,
    allowedActionsForSubscription,
    assertActionAllowed,
    executeSubscriptionAction,
    transitionError
};
