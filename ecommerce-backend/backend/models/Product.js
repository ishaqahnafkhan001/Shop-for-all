const mongoose = require('mongoose');
const { Schema } = mongoose;

const keyValueSchema = new Schema({
    title: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
}, { _id: false });

const variantSchema = new Schema({
    sku: { type: String, trim: true },
    attributes: [
        {
            name: { type: String, required: true },
            value: { type: String, required: true }
        }
    ],
    stock: { type: Number, required: true, min: 0 },
    priceOverride: { type: Number },
    image: String,
    isActive: { type: Boolean, default: true }
}, { _id: true });

const productSchema = new Schema({
    // Tenant Reference
    shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    category: { type: String, index: true },
    images: [String],
    videos: [String],

    pricing: {
        buyingPrice: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        discount: { type: Number, default: 0, min: 0, max: 100 }
    },

    variants: {
        type: [variantSchema],
        validate: [v => v.length > 0, 'A product must have at least one variant']
    },

    features: [keyValueSchema],
    specifications: [keyValueSchema],
    comments: [keyValueSchema], // Admin notes

    // 🌟 FAST REVIEW METADATA
    averageRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

productSchema.virtual('finalPrice').get(function () {
    if (!this.pricing) return undefined;
    const discount = this.pricing.discount || 0;
    const price = this.pricing.sellingPrice;
    if (discount > 0) return Math.round(price - (price * discount) / 100);
    return price;
});

productSchema.virtual('totalStock').get(function () {
    if (!this.variants) return undefined;
    return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
});

productSchema.index({ shop_id: 1, category: 1 });
productSchema.index({ title: "text", description: "text" });

productSchema.pre('save', async function () {
    if (this.variants && this.variants.some(v => v.stock < 0)) {
        throw new Error("Stock cannot be negative");
    }
});

module.exports = mongoose.model('Product', productSchema);