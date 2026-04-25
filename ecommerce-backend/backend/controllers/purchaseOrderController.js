const PurchaseOrder = require('../models/PurchaseOrder');

const mongoose = require('mongoose');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');



exports.createPO = async (req, res) => {
    try {
        const { supplier, items } = req.body;

        let totalCost = 0;

        items.forEach(i => {
            totalCost += i.quantity * i.costPrice;
        });

        const po = await PurchaseOrder.create({
            shop_id: req.user.shopId,
            supplier,
            items,
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
        const po = await PurchaseOrder.findById(req.params.id).session(session);

        if (!po) throw new Error("PO not found");

        if (po.status === 'Received') {
            throw new Error("Already received");
        }

        for (const item of po.items) {

            const product = await Product.findById(item.productId).session(session);

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
    const pos = await PurchaseOrder.find({
        shop_id: req.user.shopId
    }).populate('supplier');

    res.json(pos);
};