const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * 🔹 Key-Value Schema (Reusable)
 */
const keyValueSchema = new Schema({
    title: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
}, { _id: false });

/**
 * 🔹 Variant Schema (CRITICAL)
 */
const variantSchema = new Schema({
    sku: { type: String, trim: true },

    attributes: [
        {
            name: { type: String, required: true }, // e.g. color, size
            value: { type: String, required: true } // e.g. white, M
        }
    ],

    stock: { type: Number, required: true, min: 0 },

    priceOverride: { type: Number }, // optional per variant price

    image: String,

    isActive: { type: Boolean, default: true }

}, { _id: true });

/**
 * 🔹 Main Product Schema
 */
const productSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },

    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    description: {
        type: String,
        required: true
    },

    category: {
        type: String,
        index: true
    },

    images: [String],

    pricing: {
        buyingPrice: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        discount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },

    /**
     * ✅ VARIANTS (Stock lives here)
     */
    variants: {
        type: [variantSchema],
        validate: v => v.length > 0 // at least one variant required
    },

    /**
     * ✅ DYNAMIC FIELDS
     */
    features: [keyValueSchema],
    specifications: [keyValueSchema],
    comments: [keyValueSchema],

    /**
     * ✅ STATUS CONTROL
     */
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});




/**
 * 💰 Final Price (Product level)
 */
productSchema.virtual('finalPrice').get(function () {
    const discount = this.pricing.discount || 0;
    const price = this.pricing.sellingPrice;

    if (discount > 0) {
        return Math.round(price - (price * discount) / 100);
    }

    return price;
});

/**
 * 📦 Total Stock (sum of variants)
 */
productSchema.virtual('totalStock').get(function () {
    return this.variants.reduce((sum, v) => sum + v.stock, 0);
});



productSchema.index({ shop_id: 1, category: 1 });
productSchema.index({ title: "text", description: "text" });


/**
 * Ensure no negative stock
 */
productSchema.pre('save', async function () {

    const invalid = this.variants.some(v => v.stock < 0);

    if (invalid) {
        throw new Error("Stock cannot be negative");
    }

});


module.exports = mongoose.model('Product', productSchema);