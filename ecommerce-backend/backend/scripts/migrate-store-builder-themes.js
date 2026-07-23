require('dotenv').config();

const connectDB = require('../config/db');
const Shop = require('../models/Shop');
const { normalizeTheme } = require('@scaleup/storefront-theme');
const { ensureThemeSectionArchitecture } = require('../services/themeSectionService');
const { fillMissingPolicyDefaults } = require('../services/policies/defaultPolicyTemplates');

const apply = process.argv.includes('--apply');

const run = async () => {
    await connectDB();
    const cursor = Shop.find({}).select('_id shopName theme themeRevision').lean().cursor();
    let scanned = 0;
    let changed = 0;

    for await (const shop of cursor) {
        scanned += 1;
        const holder = { _id: shop._id, theme: normalizeTheme(shop.theme || {}) };
        await ensureThemeSectionArchitecture(holder, { persist: false });
        holder.theme.policies = fillMissingPolicyDefaults(holder.theme.policies || {}, { storeName: shop.shopName }).policies;
        holder.theme.migrations = { ...(holder.theme.migrations || {}), bannerSectionsV1: true };
        const before = JSON.stringify(shop.theme || {});
        const after = JSON.stringify(holder.theme);
        if (before === after && shop.themeRevision !== undefined) continue;
        changed += 1;
        if (apply) {
            await Shop.updateOne({ _id: shop._id }, {
                $set: {
                    theme: holder.theme,
                    themeRevision: Number(shop.themeRevision || 0)
                }
            });
        }
    }

    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', scanned, changed }));
    process.exit(0);
};

run().catch(error => {
    console.error('Store Builder theme migration failed:', error.message);
    process.exit(1);
});
