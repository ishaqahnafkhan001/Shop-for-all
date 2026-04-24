const Shop = require('../models/Shop'); // Or wherever your Shop model is
const Product = require('../models/Product');


const Order = require('../models/Order');
const User = require('../models/User'); // We need this to create Guest customers

exports.createPublicOrder = async (req, res) => {
    try {
        const { subdomain, customer, shippingAddress, shippingZone, items, shippingCost, totalAmount } = req.body;

        // 1. Find the Shop
        const shop = await Shop.findOne({ subdomain });
        if (!shop) {
            return res.status(404).json({ error: "Shop not found" });
        }

        // 2. GUEST CHECKOUT FIX: Find or create a User account for the customer
        // Your Order schema requires an ObjectId for the customer.
        let orderCustomer = await User.findOne({ email: customer.email });

        if (!orderCustomer) {
            // If they don't exist, create a background guest account
            orderCustomer = new User({
                shop_id: shop._id,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone,
                role: 'Customer',
                password: 'GuestUser_' + Math.random().toString(36).slice(-8) // Random secure password
            });
            await orderCustomer.save();
        }

        // 3. SECURE PRICE CHECK & STOCK REDUCTION
        let itemsWithSecurePrices = [];
        let calculatedSubtotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.product);

            if (!product) return res.status(404).json({ error: "A product was not found." });
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
            }

            // Push the item matching your exact strict schema
            itemsWithSecurePrices.push({
                product: product._id,
                quantity: item.quantity,
                price: product.sellingPrice,      // Secure price from DB
                buyingPrice: product.buyingPrice  // ✨ Hidden buying price for your profit charts!
            });

            calculatedSubtotal += (product.sellingPrice * item.quantity);

            // ✨ Reduce the stock
            product.stock -= item.quantity;
            await product.save();
        }

        // 4. Create the Final Order
        const newOrder = new Order({
            shop_id: shop._id,
            customer: orderCustomer._id, // ✨ The true ObjectId
            items: itemsWithSecurePrices,
            shippingZone,
            shippingCost,
            totalAmount: calculatedSubtotal + shippingCost, // Trust the backend math
            shippingAddress,
            status: 'Pending'
        });

        await newOrder.save();

        res.status(201).json(newOrder);

    } catch (err) {
        console.error("Order Creation Error:", err);
        res.status(500).json({ error: "Server error while placing order." });
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
            query.sellingPrice = {};
            if (minPrice) query.sellingPrice.$gte = Number(minPrice);
            if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
        }

        // ✨ THE NEW SORTING LOGIC ✨
        let sortQuery = { createdAt: -1, _id: 1 }; // Default: Newest first

        if (sort === 'priceAsc') sortQuery = { sellingPrice: 1, _id: 1 };
        else if (sort === 'priceDesc') sortQuery = { sellingPrice: -1, _id: 1 };
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