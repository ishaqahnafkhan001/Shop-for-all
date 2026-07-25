const mongoose = require('mongoose');
require('dotenv').config();

const VendorPlan = require('../models/VendorPlan');
const {
    PLAN_CONFIG_VERSION,
    PLAN_DEFINITIONS
} = require('../config/subscriptionPlans');
const {
    assertValidPlanCapabilityMatrix
} = require('../config/subscriptionFeatures');

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPlanUpdate = (plan, existing = null, now = new Date()) => {
    const existingLimits = existing?.limits || {};
    const limits = {
        ...plan.limits,
        ...existingLimits
    };
    const configIsCurrent = Number(existing?.planConfigVersion) === PLAN_CONFIG_VERSION;
    return {
        name: plan.name,
        slug: plan.slug,
        monthlyPrice: existing?.monthlyPrice ?? plan.monthlyPrice,
        yearlyPrice: existing?.yearlyPrice ?? existing?.annualPrice ?? plan.yearlyPrice,
        currency: existing?.currency || plan.currency,
        productLimit: limits.productCount,
        staffLimit: limits.staffAccounts,
        limits,
        // A version bump applies security defaults once; current-version edits remain intentional.
        features: configIsCurrent
            ? { ...plan.features, ...(existing?.features || {}) }
            : { ...plan.features },
        storeBuilderAccess: configIsCurrent
            ? existing?.storeBuilderAccess || plan.storeBuilderAccess
            : plan.storeBuilderAccess,
        storeBuilderCapabilities: configIsCurrent
            ? { ...plan.storeBuilderCapabilities, ...(existing?.storeBuilderCapabilities || {}) }
            : { ...plan.storeBuilderCapabilities },
        badgeEligible: configIsCurrent
            ? existing?.badgeEligible ?? plan.badgeEligible
            : plan.badgeEligible,
        prioritySupport: configIsCurrent
            ? existing?.prioritySupport ?? plan.prioritySupport
            : plan.prioritySupport,
        isActive: existing?.isActive === undefined ? true : existing.isActive,
        planConfigVersion: PLAN_CONFIG_VERSION,
        lastSyncedAt: now
    };
};

const syncSubscriptionPlans = async ({ dryRun = false, logger = console } = {}) => {
    assertValidPlanCapabilityMatrix(PLAN_DEFINITIONS);
    const now = new Date();
    const summary = { created: 0, updated: 0, unchanged: 0, dryRun, planConfigVersion: PLAN_CONFIG_VERSION };

    for (const plan of Object.values(PLAN_DEFINITIONS)) {
        const existingRecords = await VendorPlan.find({
            $or: [
                { slug: plan.slug },
                { name: { $regex: `^${escapeRegex(plan.name)}$`, $options: 'i' } }
            ]
        }).lean();

        if (existingRecords.length > 1) {
            throw new Error(`Duplicate legacy plan records found for ${plan.name}. Resolve them before synchronization.`);
        }

        const existing = existingRecords[0] || null;
        if (dryRun) {
            logger.log(`${plan.slug}: ${existing ? `update ${existing._id}` : 'create'}`);
            continue;
        }

        const update = buildPlanUpdate(plan, existing, now);
        if (existing) {
            await VendorPlan.findByIdAndUpdate(existing._id, { $set: update }, {
                runValidators: true
            });
            summary.updated += 1;
        } else {
            try {
                await VendorPlan.create(update);
                summary.created += 1;
            } catch (error) {
                if (error?.code !== 11000) throw error;

                // The API and worker can start together against a fresh database.
                const concurrent = await VendorPlan.findOne({ slug: plan.slug }).lean();
                if (!concurrent) throw error;
                await VendorPlan.findByIdAndUpdate(
                    concurrent._id,
                    { $set: buildPlanUpdate(plan, concurrent, now) },
                    { runValidators: true }
                );
                summary.updated += 1;
            }
        }
    }

    return summary;
};

const runCli = async () => {
    if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
        throw new Error('MONGO_URI is required');
    }
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const dryRun = process.argv.includes('--dry-run');
    const summary = await syncSubscriptionPlans({ dryRun });
    console.log(dryRun
        ? 'Subscription plan dry run completed; no records changed.'
        : `Subscription plans synchronized at configuration version ${summary.planConfigVersion}.`);
    await mongoose.disconnect();
};

if (require.main === module) {
    runCli().catch(async (error) => {
        console.error('Subscription plan synchronization failed:', error.message);
        await mongoose.disconnect().catch(() => {});
        process.exitCode = 1;
    });
}

module.exports = {
    buildPlanUpdate,
    syncSubscriptionPlans
};
