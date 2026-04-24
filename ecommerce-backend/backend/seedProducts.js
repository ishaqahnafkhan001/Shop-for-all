const mongoose = require('mongoose');
const Product = require('./models/Product'); // Update path to your model
const Shop = require('./models/Shop');       // Update path to your model
require('dotenv').config(); // 👈 THIS IS THE MISSING PIECE
// 🚨 PASTE YOUR ACTUAL SHOP IDs FROM MONGODB COMPASS OR POSTMAN HERE
const shops = [
    { id: '69ebe644731048db45938278', type: 'Tech' },    // Shop 1
    { id: '69ebe657731048db4593827a', type: 'Fashion' }, // Shop 2
    { id: '69ebe662731048db4593827c', type: 'Grocery' }  // Shop 3
];

const categories = {
    Tech: ['Keyboards', 'Mice', 'Monitors', 'Cables', 'Storage'],
    Fashion: ['T-Shirts', 'Hoodies', 'Jeans', 'Sneakers', 'Caps'],
    Grocery: ['Fruits', 'Vegetables', 'Snacks', 'Beverages', 'Dairy']
};

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        // Clear existing products to avoid duplicates during testing
        await Product.deleteMany({});

        const allProducts = [];

        shops.forEach((shop) => {
            for (let i = 1; i <= 100; i++) {
                const bPrice = Math.floor(Math.random() * 5000) + 100; // 100 to 5100
                const sPrice = Math.floor(bPrice * (1.2 + Math.random() * 0.5)); // 20% to 70% markup

                // Randomize discount: 40% of items will have a discount
                const hasDiscount = Math.random() > 0.6;
                const discountVal = hasDiscount ? [5, 10, 15, 20, 25, 50][Math.floor(Math.random() * 6)] : 0;

                allProducts.push({
                    shop_id: shop.id,
                    title: `${shop.type} Item #${i}`,
                    description: `High-quality ${shop.type} product for professional use. Tested and certified.`,
                    buyingPrice: bPrice,
                    sellingPrice: sPrice,
                    discount: discountVal,
                    category: categories[shop.type][Math.floor(Math.random() * 5)],
                    imageUrl: `https://picsum.photos/seed/${shop.type}${i}/400/400`,
                    stock: Math.floor(Math.random() * 50),
                });
            }
        });

        await Product.insertMany(allProducts);
        console.log("Successfully seeded 300 products (100 per shop)!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();