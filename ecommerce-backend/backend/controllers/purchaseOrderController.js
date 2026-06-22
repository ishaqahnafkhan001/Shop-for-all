const PurchaseOrder = require('../models/PurchaseOrder');

const mongoose = require('mongoose');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const Supplier = require('../models/Supplier');

const getShopId = (req) => req.tenantId || req.user?.shopId || req.user?.shop_id;
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizePurchaseItems = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Purchase order requires at least one item');
    }

    return items.map(item => {
        if (!isObjectId(item.productId) || !isObjectId(item.variantId)) {
            throw new Error('Invalid purchase order item');
        }

        const quantity = Number(item.quantity);
        const costPrice = Number(item.costPrice);

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error('Purchase item quantity must be a positive whole number');
        }

        if (!Number.isFinite(costPrice) || costPrice < 0) {
            throw new Error('Purchase item cost must be a positive number');
        }

        return {
            productId: item.productId,
            variantId: item.variantId,
            quantity,
            costPrice
        };
    });
};


exports.createPO = async (req, res) => {
    try {
        const { supplier, items } = req.body;
        const shopId = getShopId(req);

        if (!shopId) {
            return res.status(400).json({ error: 'Shop context is required' });
        }

        if (!isObjectId(supplier)) {
            return res.status(400).json({ error: 'Valid supplier is required' });
        }

        const supplierExists = await Supplier.exists({
            _id: supplier,
            shop_id: shopId,
            isActive: true
        });

        if (!supplierExists) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const cleanItems = normalizePurchaseItems(items);

        let totalCost = 0;

        for (const i of cleanItems) {
            const productExists = await Product.exists({
                _id: i.productId,
                shop_id: shopId,
                isDeleted: false,
                'variants._id': i.variantId
            });

            if (!productExists) {
                return res.status(404).json({ error: 'Purchase item product or variant not found' });
            }

            totalCost += i.quantity * i.costPrice;
        }

        const po = await PurchaseOrder.create({
            shop_id: shopId,
            supplier,
            items: cleanItems,
            totalCost
        });

        res.status(201).json({ success: true, po });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.receivePO = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const shopId = getShopId(req);

        if (!shopId) {
            throw new Error('Shop context is required');
        }

        const po = await PurchaseOrder.findOne({
            _id: req.params.id,
            shop_id: shopId
        }).session(session);

        if (!po) throw new Error("PO not found");

        if (po.status === 'Received') {
            throw new Error("Already received");
        }

        for (const item of po.items) {

            const product = await Product.findOne({
                _id: item.productId,
                shop_id: shopId,
                isDeleted: false
            }).session(session);

            if (!product) throw new Error("Product not found");

            const variant = product.variants.id(item.variantId);

            if (!variant) throw new Error("Variant not found");

            const beforeStock = variant.stock;

            // 🔥 ADD STOCK
            variant.stock += item.quantity;

            await product.save({ session });

            // 🔥 INVENTORY LOG
            await InventoryLog.create([{
                shop_id: po.shop_id,
                productId: product._id,
                variantId: variant._id,

                change: item.quantity,
                type: 'RESTOCK',
                referenceId: po._id,

                beforeStock,
                afterStock: variant.stock,

                note: 'Purchase Order received'
            }], { session });
        }

        po.status = 'Received';
        po.receivedAt = new Date();

        await po.save({ session });

        await session.commitTransaction();

        res.json({ success: true, message: "Stock updated" });

    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ error: err.message });
    } finally {
        session.endSession();
    }
};


exports.getPOs = async (req, res) => {
    const shopId = getShopId(req);
    const pos = await PurchaseOrder.find({
        shop_id: shopId
    }).populate('supplier');

    res.json(pos);
};
