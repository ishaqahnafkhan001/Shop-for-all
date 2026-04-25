const Product = require('../models/Product');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');
/**
 * @desc Get all products (with pagination + search)
 */
exports.getShopProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category } = req.query;

        const query = {
            shop_id: req.user.shopId,
            isDeleted: false
        };

        if (category) query.category = category;

        if (search) {
            query.$text = { $search: search };
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Product.countDocuments(query);

        res.status(200).json({
            data: products,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
};

/**
 * @desc Create product
 */
exports.createProduct = async (req, res) => {
    try {
        const { error, value } = createProductSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const product = await Product.create({
            ...value,
            shop_id: req.user.shopId
        });

        res.status(201).json({
            message: "Product created successfully",
            product
        });

    } catch (err) {
        console.error(err); // keep this

        res.status(500).json({
            error: "Failed to create product",
            details: err.message   // 👈 ADD THIS
        });
    }}

/**
 * @desc Update product (SAFE PATCH)
 */




exports.updateProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shopId = req.user.shopId;

    // 🔥 1. SANITIZE INPUT (remove unwanted _id from attributes)
    if (req.body.variants) {
      req.body.variants = req.body.variants.map(v => ({
        ...v,
        attributes: v.attributes.map(a => ({
          name: a.name,
          value: a.value
        }))
      }));
    }

    // 🔹 2. VALIDATE
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) throw new Error(error.details[0].message);

    // 🔹 3. GET PRODUCT
    const product = await Product.findOne({
      _id: req.params.id,
      shop_id: shopId,
      isDeleted: false
    }).session(session);

    if (!product) throw new Error("Product not found");

    // 🔹 4. STORE OLD STOCK
    const oldVariantsMap = new Map();
    product.variants.forEach(v => {
      oldVariantsMap.set(v._id.toString(), v.stock);
    });

    // 🔹 5. UPDATE BASIC FIELDS
    if (value.title !== undefined) product.title = value.title;
    if (value.description !== undefined) product.description = value.description;
    if (value.category !== undefined) product.category = value.category;

    if (value.pricing) {
      product.pricing = {
        ...product.pricing,
        ...value.pricing
      };
    }

    // 🔥 6. SMART VARIANT UPDATE (NOT REPLACE)
    if (value.variants) {

      const updatedVariants = [];

      for (const incoming of value.variants) {

        if (incoming._id) {
          // 🔁 EXISTING VARIANT
          const existing = product.variants.id(incoming._id);

          if (existing) {
            existing.stock = incoming.stock;
            existing.attributes = incoming.attributes;
            existing.priceOverride = incoming.priceOverride;
            existing.image = incoming.image;
            existing.isActive = incoming.isActive ?? true;

            updatedVariants.push(existing);
          }
        } else {
          // ➕ NEW VARIANT
          updatedVariants.push(incoming);
        }
      }

      product.variants = updatedVariants;
    }

    // 🔹 7. SAVE
    await product.save({ session });

    // 🔥 8. INVENTORY LOGGING
    for (const v of product.variants) {

      const oldStock = oldVariantsMap.get(v._id.toString()) ?? 0;
      const diff = v.stock - oldStock;

      if (diff !== 0) {
        await InventoryLog.create([{
          shop_id: shopId,
          productId: product._id,
          variantId: v._id,

          change: diff,
          type: 'MANUAL',
          referenceId: product._id,

          beforeStock: oldStock,
          afterStock: v.stock,

          user: req.user._id,
          note: 'Manual update'
        }], { session });
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });

  } catch (err) {

    await session.abortTransaction();

    res.status(400).json({
      error: err.message
    });

  } finally {
    session.endSession();
  }
};



/**
 * @desc Soft delete product
 */
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndUpdate(
            {
                _id: req.params.id,
                shop_id: req.user.shopId
            },
            {
                isDeleted: true
            },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found or unauthorized" });
        }

        res.status(200).json({
            message: "Product deleted (soft)"
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to delete product" });
    }
};