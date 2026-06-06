require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { makeVariantKey, normalizeProductOptions } = require('../helpers/variantMatrix');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const buildOptionsFromVariants = (variants = []) => {
    const optionMap = new Map();

    variants.forEach((variant) => {
        (variant.attributes || []).forEach((attribute) => {
            const name = String(attribute.name || '').trim().toLowerCase();
            const value = String(attribute.value || '').trim();
            if (!name || !value) return;
            if (!optionMap.has(name)) optionMap.set(name, []);
            const values = optionMap.get(name);
            if (!values.some(existing => existing.toLowerCase() === value.toLowerCase())) {
                values.push(value);
            }
        });
    });

    return normalizeProductOptions(
        [...optionMap.entries()].map(([name, options]) => ({ name, options }))
    );
};

const migrate = async () => {
    if (!MONGO_URI) throw new Error('MONGO_URI or MONGODB_URI is required');
    await mongoose.connect(MONGO_URI);

    let updated = 0;
    const cursor = Product.find({ isDeleted: false }).cursor();

    for await (const product of cursor) {
        let changed = false;

        if (!product.options?.length) {
            product.options = buildOptionsFromVariants(product.variants);
            changed = true;
        }

        product.variants.forEach((variant) => {
            variant.optionKey = makeVariantKey(variant.attributes || []);
            variant.status = variant.status || (variant.isActive === false ? 'draft' : 'active');
            variant.isActive = variant.status === 'active' && variant.isActive !== false;
            variant.inventory = {
                trackQuantity: true,
                allowOversell: false,
                reservedStock: 0,
                lowStockThreshold: product.lowStockThreshold || 5,
                ...(variant.inventory?.toObject ? variant.inventory.toObject() : variant.inventory || {}),
                stock: variant.stock || 0
            };
            variant.pricing = {
                ...(variant.pricing?.toObject ? variant.pricing.toObject() : variant.pricing || {}),
                ...(variant.priceOverride !== undefined && { price: variant.priceOverride })
            };
            variant.tax = {
                taxable: true,
                ...(variant.tax?.toObject ? variant.tax.toObject() : variant.tax || {})
            };
            changed = true;
        });

        if (changed) {
            await product.save();
            updated += 1;
        }
    }

    console.log(`Product variant migration complete. Updated ${updated} product(s).`);
    await mongoose.disconnect();
};

migrate().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
