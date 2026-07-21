const mongoose = require('mongoose');
require('dotenv').config();

const VendorPlan = require('../models/VendorPlan');
const { PLAN_DEFINITIONS } = require('../config/subscriptionPlans');

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const run = async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    await mongoose.connect(process.env.MONGO_URI);
    const dryRun = process.argv.includes('--dry-run');

    for (const plan of Object.values(PLAN_DEFINITIONS)) {
        const existing = await VendorPlan.find({
            $or: [
                { slug: plan.slug },
                { name: { $regex: `^${escapeRegex(plan.name)}$`, $options: 'i' } }
            ]
        }).select('_id name slug').lean();

        if (existing.length > 1) {
            throw new Error(`Duplicate legacy plan records found for ${plan.name}. Resolve them before synchronization.`);
        }

        if (dryRun) {
            console.log(`${plan.slug}: ${existing.length ? `update ${existing[0]._id}` : 'create'}`);
            continue;
        }

        const update = {
            name: plan.name,
            slug: plan.slug,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            currency: plan.currency,
            productLimit: plan.limits.productCount,
            staffLimit: plan.limits.staffAccounts,
            limits: plan.limits,
            features: plan.features,
            storeBuilderAccess: plan.storeBuilderAccess,
            storeBuilderCapabilities: plan.storeBuilderCapabilities,
            badgeEligible: plan.badgeEligible,
            prioritySupport: plan.prioritySupport,
            isActive: true
        };

        if (existing[0]) {
            await VendorPlan.findByIdAndUpdate(existing[0]._id, { $set: update }, { runValidators: true });
        } else {
            await VendorPlan.create(update);
        }
    }

    console.log(dryRun
        ? 'Subscription plan dry run completed; no records changed.'
        : 'Subscription plans synchronized: starter, growth, pro');
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Subscription plan synchronization failed:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
