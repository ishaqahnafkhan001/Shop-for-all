const Collection = require('../models/Collection');
const Product = require('../models/Product');

const slugify = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

exports.getCollections = async (req, res) => {
    try {
        const collections = await Collection.find({
            shop_id: req.tenantId
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: collections });
    } catch (err) {
        console.error('Get collections error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch collections' });
    }
};

exports.createCollection = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            slug: req.body.slug || slugify(req.body.title),
            shop_id: req.tenantId
        };

        const collection = await Collection.create(payload);

        if (Array.isArray(payload.productIds) && payload.productIds.length > 0) {
            await Product.updateMany(
                { _id: { $in: payload.productIds }, shop_id: req.tenantId },
                { $addToSet: { collections: collection._id } }
            );
        }

        res.status(201).json({ success: true, data: collection });
    } catch (err) {
        console.error('Create collection error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to create collection' });
    }
};

exports.updateCollection = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.title && !payload.slug) payload.slug = slugify(payload.title);

        const collection = await Collection.findOneAndUpdate(
            { _id: req.params.id, shop_id: req.tenantId },
            payload,
            { new: true, runValidators: true }
        );

        if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });

        if (Array.isArray(payload.productIds)) {
            await Product.updateMany(
                { shop_id: req.tenantId, collections: collection._id },
                { $pull: { collections: collection._id } }
            );
            await Product.updateMany(
                { _id: { $in: payload.productIds }, shop_id: req.tenantId },
                { $addToSet: { collections: collection._id } }
            );
        }

        res.status(200).json({ success: true, data: collection });
    } catch (err) {
        console.error('Update collection error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update collection' });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findOneAndDelete({
            _id: req.params.id,
            shop_id: req.tenantId
        });

        if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });

        await Product.updateMany(
            { shop_id: req.tenantId, collections: collection._id },
            { $pull: { collections: collection._id } }
        );

        res.status(200).json({ success: true, message: 'Collection deleted' });
    } catch (err) {
        console.error('Delete collection error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete collection' });
    }
};
