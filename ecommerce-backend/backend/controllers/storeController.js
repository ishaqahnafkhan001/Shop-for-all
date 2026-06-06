const Shop = require('../models/Shop');
const Product = require('../models/Product');
const { getPathaoCities, getPathaoZones, getPathaoAreas, getPathaoToken,createPathaoStore,getPathaoStores } = require('../services/pathaoService');


exports.getStoreInfo = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId).select('-__v');

        if (!shop) {
            return res.status(404).json({ error: "Shop details not found." });
        }

        res.status(200).json(shop);
    } catch (err) {
        res.status(500).json({ error: "Error fetching shop info." });
    }
};


exports.getStoreProducts = async (req, res) => {
    try {
        const products = await Product.find({ shop_id: req.tenantId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: products.length,
            products
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching products." });
    }
};

exports.getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            shop_id: req.tenantId,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ error: "Error fetching product details." });
    }
};


exports.getCities = async (req, res) => {
    try {
        const token = await getPathaoToken();
        const cities = await getPathaoCities(token);
        res.status(200).json({ success: true, data: cities });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load cities' });
    }
};

exports.getZones = async (req, res) => {
    try {
        const token = await getPathaoToken();
        const zones = await getPathaoZones(token, req.params.cityId);
        res.status(200).json({ success: true, data: zones });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load zones' });
    }
};

exports.getAreas = async (req, res) => {
    try {
        const token = await getPathaoToken();
        const areas = await getPathaoAreas(token, req.params.zoneId);
        res.status(200).json({ success: true, data: areas });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load areas' });
    }
};

const Joi = require('joi');


const pathaoSetupSchema = Joi.object({
    contact_name: Joi.string().min(3).max(50).required(),
    contact_number: Joi.string().length(11).required().messages({
        'string.length': 'Contact number must be exactly 11 digits'
    }),
    address: Joi.string().min(10).max(120).required(),
    city_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    zone_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    area_id: Joi.alternatives().try(Joi.number(), Joi.string()).required()
});

exports.setupVendorPathaoStore = async (req, res) => {
    try {
        const { error, value } = pathaoSetupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const shopId = req.tenantId;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ success: false, error: 'Shop not found' });
        }

        const token = await getPathaoToken();

        const storePayload = {
            name: shop.shopName.substring(0, 50),
            contact_name: value.contact_name,
            contact_number: value.contact_number,
            address: value.address,
            city_id: parseInt(value.city_id, 10),
            zone_id: parseInt(value.zone_id, 10),
            area_id: parseInt(value.area_id, 10)
        };

        await createPathaoStore(token, storePayload);

        const { data: storesResponse } = await getPathaoStores(token);
        const storesList = storesResponse?.data?.data || storesResponse?.data || [];

        const newStore = storesList.find(
            s => s.contact_number === storePayload.contact_number && s.store_name === storePayload.name
        );

        if (!newStore || !newStore.store_id) {
            return res.status(500).json({
                success: false,
                error: "Store was created in Pathao, but we couldn't retrieve the ID. Please contact support."
            });
        }

        shop.pathaoStoreId = newStore.store_id;
        await shop.save();

        res.status(200).json({
            success: true,
            message: 'Pathao shipping location successfully linked to your shop!',
            data: {
                pathaoStoreId: shop.pathaoStoreId
            }
        });

    } catch (err) {
        console.error("Vendor Pathao Setup Error:", err);
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to setup Pathao integration'
        });
    }
};

// Link Existing Pathao Account
exports.linkExistingPathaoAccount = async (req, res) => {
    try {
        const { client_id, client_secret, username, password, store_id, isLive } = req.body;
        const shopId = req.tenantId;

        // 1. Test the credentials by trying to get a token
        const customCreds = { client_id, client_secret, username, password, isLive };
        const token = await getPathaoToken(customCreds); // If this fails, it throws an error to the catch block

        // 2. If token works, save everything to the database
        const shop = await Shop.findById(shopId);
        shop.pathaoStoreId = parseInt(store_id, 10);
        shop.pathaoCredentials = customCreds;
        await shop.save();

        res.status(200).json({
            success: true,
            message: 'Successfully linked your existing Pathao account!',
            data: { pathaoStoreId: shop.pathaoStoreId }
        });

    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Invalid Pathao credentials.' });
    }
};
