#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const Product = require('../models/Product');
const { getUniqueSlug } = require('../services/products/productQueryService');

const isDryRun = process.argv.includes('--dry-run');

const connect = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGO_URI is required to backfill product slugs.');
    }

    await mongoose.connect(uri);
};

const run = async () => {
    await connect();

    const products = await Product.find({
        isDeleted: false,
        $or: [
            { slug: { $exists: false } },
            { slug: null },
            { slug: '' }
        ]
    }).select('_id shop_id title slug').sort({ createdAt: 1 });

    let updated = 0;
    for (const product of products) {
        const slug = await getUniqueSlug({
            shopId: product.shop_id,
            title: product.title
        });

        if (isDryRun) {
            console.log(`[dry-run] ${product._id} "${product.title}" -> ${slug}`);
        } else {
            product.slug = slug;
            await product.save();
            updated += 1;
        }
    }

    console.log(`${isDryRun ? 'Would update' : 'Updated'} ${isDryRun ? products.length : updated} product slug(s).`);
};

run()
    .catch((error) => {
        console.error('Product slug backfill failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });

