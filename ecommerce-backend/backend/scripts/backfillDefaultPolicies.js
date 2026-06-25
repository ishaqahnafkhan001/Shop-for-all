#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const Shop = require('../models/Shop');
const {
    fillMissingPolicyDefaults
} = require('../services/policies/defaultPolicyTemplates');

const isDryRun = process.argv.includes('--dry-run');

const connect = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGO_URI is required to backfill default store policies.');
    }

    await mongoose.connect(uri);
};

const formatList = (items = []) => (items.length ? items.join(', ') : 'none');

const run = async () => {
    await connect();

    const shops = await Shop.find({})
        .select('_id shopName subdomain theme.policies')
        .sort({ createdAt: 1 });

    let shopsUpdated = 0;
    let policiesAdded = 0;
    let shopsNeedingUpdate = 0;

    for (const shop of shops) {
        const result = fillMissingPolicyDefaults(shop.theme?.policies || {}, {
            storeName: shop.shopName
        });

        if (result.added.length === 0) {
            console.log(`[skip] ${shop.shopName} (${shop.subdomain}) added=${formatList(result.added)} skipped=${formatList(result.skipped)}`);
            continue;
        }

        shopsNeedingUpdate += 1;
        policiesAdded += result.added.length;

        if (isDryRun) {
            console.log(`[dry-run] ${shop.shopName} (${shop.subdomain}) would add=${formatList(result.added)} skipped=${formatList(result.skipped)}`);
            continue;
        }

        shop.set('theme.policies', result.policies);
        await shop.save();
        shopsUpdated += 1;
        console.log(`[updated] ${shop.shopName} (${shop.subdomain}) added=${formatList(result.added)} skipped=${formatList(result.skipped)}`);
    }

    console.log(`${isDryRun ? 'Would update' : 'Updated'} ${isDryRun ? shopsNeedingUpdate : shopsUpdated} shop(s).`);
    console.log(`${isDryRun ? 'Would add' : 'Added'} ${policiesAdded} policy value(s).`);
};

run()
    .catch((error) => {
        console.error('Default policy backfill failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
