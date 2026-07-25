const Job = require('../../models/Job');
const { getShopPlanAccess } = require('../billing/planAccessService');

class JobEntitlementSuppressedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'JobEntitlementSuppressedError';
        this.code = 'JOB_ENTITLEMENT_SUPPRESSED';
        this.suppressed = true;
    }
}

const suppressJob = async (job, reason) => {
    await Job.updateOne(
        {
            _id: job._id,
            ...(job.lockId ? { lockId: job.lockId } : {})
        },
        {
            $set: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: String(reason || 'Entitlement changed').slice(0, 500),
                lockedAt: null,
                lockId: '',
                lastError: ''
            }
        }
    );
    throw new JobEntitlementSuppressedError(reason);
};

const assertJobEntitlementStillValid = async ({
    job,
    shopId = job?.shop_id,
    feature = null,
    expectedEntitlementVersion = job?.entitlementVersion,
    allowInactive = false
}) => {
    if (!job?._id) throw new Error('Job context is required for entitlement validation');
    const persistedJob = await Job.findById(job._id)
        .select('status +lockId entitlementVersion cancellationReason')
        .lean();
    if (
        !persistedJob ||
        persistedJob.status === 'cancelled' ||
        (job.lockId && persistedJob.lockId !== job.lockId)
    ) {
        throw new JobEntitlementSuppressedError(
            persistedJob?.cancellationReason || 'Job was cancelled before the external side effect.'
        );
    }

    if (!shopId) return { valid: true, access: null };
    const access = await getShopPlanAccess(shopId);
    if (!allowInactive && !access.isOperational) {
        return suppressJob(job, 'Subscription is no longer operational.');
    }
    if (feature && !access.features?.[feature]) {
        return suppressJob(job, `${feature} is no longer included in the current plan.`);
    }
    if (
        expectedEntitlementVersion !== null &&
        expectedEntitlementVersion !== undefined &&
        Number(expectedEntitlementVersion) !== Number(access.entitlementVersion)
    ) {
        return suppressJob(job, 'Subscription entitlements changed after this job was queued.');
    }

    return { valid: true, access };
};

module.exports = {
    JobEntitlementSuppressedError,
    assertJobEntitlementStillValid
};
