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
    slug: { type: String, trim: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: String, index: true },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],
    collections: [{ type: Schema.Types.ObjectId, ref: 'Collection', index: true }],
    images: [String],
    videos: [String],
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Archived'],
        default: 'Published',
        index: true
    },
    seo: {
        title: { type: String, trim: true, maxlength: 70, default: '' },
        description: { type: String, trim: true, maxlength: 170, default: '' }
    },

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
    lowStockThreshold: { type: Number, default: 5, min: 0 },

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
productSchema.index({ shop_id: 1, status: 1, isActive: 1 });
productSchema.index({ shop_id: 1, isDeleted: 1, status: 1, isActive: 1, createdAt: -1 });
productSchema.index({ shop_id: 1, isDeleted: 1, category: 1, createdAt: -1 });
productSchema.index({ shop_id: 1, isDeleted: 1, 'pricing.sellingPrice': 1 });
productSchema.index({ shop_id: 1, slug: 1 }, {
    unique: true,
    partialFilterExpression: { slug: { $type: 'string' }, isDeleted: false }
});
productSchema.index({ title: "text", description: "text" });

productSchema.pre('save', async function () {
    if (!this.slug && this.title) {
        this.slug = this.title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
    }

    this.isActive = this.status === 'Published';

    if (this.variants && this.variants.some(v => v.stock < 0)) {
        throw new Error("Stock cannot be negative");
    }
});

module.exports = mongoose.model('Product', productSchema);
