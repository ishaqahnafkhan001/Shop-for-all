const mongoose = require('mongoose');
require('dotenv').config(); // Make sure your DB connection string is loaded

// Import your models (adjust the paths if your models folder is somewhere else)
const Product = require('./models/Product');
const Shop = require('./models/Shop');

// Data arrays to generate 100 unique combinations
const adjectives = ['High-Performance', 'Minimalist', 'Aesthetic', 'RGB', 'Ergonomic', 'Heavy-Duty', 'Ultra-Fast', 'Silent', 'Compact', 'Premium'];
const nouns = ['Graphics Card', 'Power Supply', 'CPU Cooler', '1TB NVMe SSD', 'Mechanical Keyboard', 'Gaming Mouse', 'Desk Lamp', 'Monitor', 'PC Case', 'Desk Mat'];
const categories = ['PC Components', 'Peripherals', 'Storage', 'Minimalist Decor', 'Accessories'];

// Helper function to get a random item from an array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper function to generate a random price
const getRandomPrice = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const seedDB = async () => {
    try {
        // 1. Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopforall');
        console.log('✅ Connected to MongoDB');

        // 2. Find a Shop to attach the products to
        // We will look for the 'apple' or 'techshop' subdomain you created earlier
        let targetShop = await Shop.findOne({});

        if (!targetShop) {
            console.error('❌ No shops found in the database! Please create a Shop first so we have a shop_id to attach the products to.');
            process.exit(1);
        }

        console.log(`🛒 Seeding products into shop: ${targetShop.name} (${targetShop.subdomain})`);

        // 3. Clear existing products for THIS shop to avoid duplicates
        await Product.deleteMany({ shop_id: targetShop._id });
        console.log('🧹 Cleared old products for this shop.');

        // 4. Generate 100 Products
        const productsToInsert = [];

        for (let i = 1; i <= 100; i++) {
            const buyingPrice = getRandomPrice(2000, 50000);
            const sellingPrice = buyingPrice + getRandomPrice(500, 5000); // Ensure selling price is always higher for profit

            productsToInsert.push({
                shop_id: targetShop._id,
                title: `${getRandom(adjectives)} ${getRandom(nouns)} - Gen ${Math.floor(Math.random() * 5) + 1}`,
                description: 'Designed for ultimate performance and a clean setup. Built with premium materials to ensure durability and aesthetic appeal.',
                // Using Picsum for unique placeholder images based on the index
                imageUrl: `https://picsum.photos/seed/tech${i}/400/400`,
                category: getRandom(categories),
                buyingPrice: buyingPrice,
                sellingPrice: sellingPrice,
                stock: Math.floor(Math.random() * 50), // Random stock between 0 and 49
            });
        }

        // 5. Insert into Database
        await Product.insertMany(productsToInsert);
        console.log(`🎉 Successfully seeded 100 products!`);

        // 6. Disconnect
        mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Seeding error:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

seedDB();