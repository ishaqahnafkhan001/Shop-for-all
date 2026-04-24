const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Tenant Isolation
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    // The buyer
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The items purchased
    items: [
        {
            product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true},
            quantity: {type: Number, required: true},
            price: {type: Number, required: true}, // This is the sellingPrice the customer paid
            buyingPrice: {type: Number, required: true} // ✨ NEW: Hidden from customer, used for profit
        }
    ],

    // --- Financials & Logistics ---
    totalAmount: {
        type: Number,
        required: true
    },
    shippingZone: {
        type: String,
        enum: ['Inside Dhaka', 'Outside Dhaka'],
        required: true
    },
    shippingCost: {
        type: Number,
        required: true,
        // When we build the checkout controller, we will enforce:
        // Inside Dhaka = 80, Outside Dhaka = 130
    },
    shippingAddress: {
        type: String,
        required: true
    },

    // --- Status ---
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    }
}, {timestamps: true});


// ==========================================
// 🚀 DATABASE INDEXING FOR HIGH PERFORMANCE
// ==========================================

// 1. Compound Index: Perfect for your Admin Dashboard's main query
// This matches: Order.find({ shop_id: ... }).sort({ createdAt: -1 })
orderSchema.index({shop_id: 1, createdAt: -1});

// 2. Filter Index: Super fast when vendors click "Show me all Pending orders"
orderSchema.index({shop_id: 1, status: 1});

// 3. Customer Index: Super fast when a customer checks their "My Order History" page
orderSchema.index({customer: 1});


module.exports = mongoose.model('Order', orderSchema);