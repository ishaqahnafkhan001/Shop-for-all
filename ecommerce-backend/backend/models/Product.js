const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    buyingPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    category: { type: String, index: true },
    imageUrl: { type: String, required: true },
    stock: { type: Number, default: 1 },
    discount: {
        type: Number,
        default: 0, // Individual product discount %
        min: 0,
        max: 100
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * ✨ THE VIRTUAL FINAL PRICE
 * This calculates the price based on the individual product discount.
 */
productSchema.virtual('finalPrice').get(function() {
    const discountToApply = this.discount || 0;

    if (discountToApply > 0) {
        const reduction = (this.sellingPrice * discountToApply) / 100;
        return Math.round(this.sellingPrice - reduction);
    }

    return this.sellingPrice;
});

module.exports = mongoose.model('Product', productSchema);