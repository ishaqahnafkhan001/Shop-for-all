const Shop = require('../models/Shop'); // Or wherever your Shop model is
const Product = require('../models/Product');


const Order = require('../models/Order');
const User = require('../models/User'); // We need this to create Guest customers

exports.createPublicOrder = async (req, res) => {
    // 🔥 THE FIX: Start a database transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { subdomain, customer, shippingAddress, shippingZone, items, shippingCost } = req.body;

        const shop = await Shop.findOne({ subdomain }).session(session);
        if (!shop) throw new Error("Shop not found");

        // 🔥 THE FIX: Secure Guest User Creation
        let orderCustomer = await User.findOne({ email: customer.email }).session(session);

        if (!orderCustomer) {
            const rawPassword = 'GuestUser_' + Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt); // Hashed!

            const [newUser] = await User.create([{
                shop_id: shop._id,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone,
                role: 'Customer',
                password: hashedPassword
            }], { session });

            orderCustomer = newUser;
        }

        let itemsWithSecurePrices = [];
        let calculatedSubtotal = 0;
        let logsToInsert = [];

        for (const item of items) {
            const product = await Product.findById(item.product).session(session);

            if (!product) throw new Error(`Product not found.`);
            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.title}`);
            }

            const beforeStock = product.stock;

            itemsWithSecurePrices.push({
                productId: product._id, // Fixed mapping to match your Order schema
                variantId: item.variantId, // Assuming you pass this from frontend
                title: product.title,
                quantity: item.quantity,
                price: product.sellingPrice,
                buyingPrice: product.pricing.buyingPrice,
                total: product.sellingPrice * item.quantity
            });

            calculatedSubtotal += (product.sellingPrice * item.quantity);

            // Deduct stock
            product.stock -= item.quantity;
            await product.save({ session });

            // 🔥 THE FIX: Sync with Admin Inventory Logs
            logsToInsert.push({
                shop_id: shop._id,
                productId: product._id,
                variantId: item.variantId, // Requires variantId from frontend
                change: -item.quantity,
                type: 'ORDER',
                beforeStock,
                afterStock: product.stock,
                user: orderCustomer._id,
                note: 'Public Storefront Order'
            });
        }

        const [newOrder] = await Order.create([{
            shop_id: shop._id,
            customer: orderCustomer._id,
            items: itemsWithSecurePrices,
            pricing: {
                subtotal: calculatedSubtotal,
                shipping: shippingCost,
                total: calculatedSubtotal + shippingCost
            },
            shipping: {
                zone: shippingZone,
                cost: shippingCost,
                address: shippingAddress
            },
            payment: { method: req.body.paymentMethod || 'COD' },
            status: 'Pending'
        }], { session });

        // Link logs to the new order and insert
        if (logsToInsert.length > 0) {
            const logsWithRef = logsToInsert.map(log => ({ ...log, referenceId: newOrder._id }));
            await InventoryLog.insertMany(logsWithRef, { session });
        }

        await session.commitTransaction();
        res.status(201).json(newOrder);

    } catch (err) {
        await session.abortTransaction();
        console.error("Order Creation Error:", err);
        res.status(400).json({ error: err.message || "Server error while placing order." });
    } finally {
        session.endSession();
    }
};
exports.getPublicShopDetails = async (req, res) => {
    try {
        const { subdomain } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 16;
        const skip = (page - 1) * limit;

        const shop = await Shop.findOne({ subdomain });
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        const { category, minPrice, maxPrice, sort } = req.query; // ✨ ADDED 'sort'
        let query = { shop_id: shop._id };

        if (category && category !== 'All') query.category = category;

        if (minPrice || maxPrice) {
            query['pricing.sellingPrice'] = {}; // FIX: use dot notation for nested fields
            if (minPrice) query['pricing.sellingPrice'].$gte = Number(minPrice);
            if (maxPrice) query['pricing.sellingPrice'].$lte = Number(maxPrice);
        }

        let sortQuery = { createdAt: -1, _id: 1 };

        if (sort === 'priceAsc') sortQuery = { 'pricing.sellingPrice': 1, _id: 1 };
        else if (sort === 'priceDesc') sortQuery = { 'pricing.sellingPrice': -1, _id: 1 };
        else if (sort === 'nameAsc') sortQuery = { title: 1, _id: 1 };
        else if (sort === 'nameDesc') sortQuery = { title: -1, _id: 1 };

        // Fetch products using the new query and sort parameters
        const products = await Product.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(query);
        const hasMore = totalProducts > (page * limit);
        const categories = await Product.distinct('category', { shop_id: shop._id });

        res.status(200).json({ shop, products, hasMore, categories });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};


exports.getPublicProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.status(200).json(product);
    } catch (err) {
        console.error("Error fetching single product:", err);
        res.status(500).json({ error: "Server error" });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const customerId = req.user.id || req.user.userId;

        // ✨ ADD THESE LOGS
        console.log("🔍 Search requested by Customer ID:", customerId);

        const orders = await Order.find({ customer: customerId })
            .sort({ createdAt: -1 });

        console.log(`📦 Found ${orders.length} orders for this ID.`);
        res.status(200).json(orders);
    } catch (err) {
        console.error("Fetch Orders Error:", err);
        res.status(500).json({ error: "Failed to fetch order history." });
    }
};

// Add this to your public controller
exports.trackPublicOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Verify it's a valid MongoDB ObjectId to prevent server crashes
        if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid Order ID format." });
        }

        const order = await Order.findById(orderId)
            // Optional: Populating product titles/images makes the tracking page look better!
            .populate('items.product', 'title imageUrl category');

        if (!order) {
            return res.status(404).json({ error: "Order not found. Please check your ID." });
        }

        res.status(200).json(order);
    } catch (err) {
        console.error("Tracking Error:", err);
        res.status(500).json({ error: "Server error while tracking order." });
    }
};