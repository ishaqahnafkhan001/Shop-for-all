const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User'); // 🌟 Import the User model
const { addReviewSchema } = require('../validations/productValidation');
const mongoose = require('mongoose');

const resolvePublicProductId = async (shopId, slugOrId) => {
    const raw = String(slugOrId || '').trim();
    const baseQuery = {
        shop_id: shopId,
        isDeleted: false,
        isActive: true,
        status: 'Published'
    };

    let product = await Product.findOne({
        ...baseQuery,
        slug: raw.toLowerCase()
    }).select('_id').lean();

    if (!product && mongoose.Types.ObjectId.isValid(raw)) {
        product = await Product.findOne({
            ...baseQuery,
            _id: raw
        }).select('_id').lean();
    }

    return product?._id || null;
};

exports.addProductReview = async (req, res) => {
    try {
        const { error, value } = addReviewSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message });

        const shopId = req.tenantId;   // Injected by resolveTenant
        const productId = await resolvePublicProductId(shopId, req.params.id);
        const userId = req.user._id;   // Injected by auth middleware

        if (!productId) {
            return res.status(404).json({ success: false, message: 'Product not found in this store' });
        }

        // 🌟 THE FIX: Fetch the user's actual name from the DB to bypass the stateless token
        const user = await User.findById(userId).select('fullName').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const review = await Review.create({
            shop_id: shopId,
            product_id: productId,
            user_id: userId,
            name: user.fullName, // 🌟 Save the fetched name into the Review document
            rating: value.rating,
            comment: value.comment
        });

        res.status(201).json({ success: true, data: review });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'You already reviewed this product' });
        }
        console.error('Error adding review:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getProductReviews = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const productId = await resolvePublicProductId(shopId, req.params.id);
        const { page = 1, limit = 10 } = req.query;

        if (!productId) {
            return res.status(404).json({ success: false, message: 'Product not found in this store' });
        }

        // 🛡️ Always query by shop_id to maintain tenant boundaries
        const reviews = await Review.find({ shop_id: shopId, product_id: productId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
