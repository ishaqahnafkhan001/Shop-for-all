/**
 * seeds.js
 * Run: node seeds.js
 * Requires: MONGO_URI in .env or hardcoded below
 */

const mongoose = require('mongoose');
require('dotenv').config();

const SHOP_ID  = new mongoose.Types.ObjectId('69ebe644731048db45938278');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_db_name';

// ─── Inline Product Schema (mirrors your actual model) ────────────────────────
const variantSchema = new mongoose.Schema({
    sku:          { type: String, trim: true },
    attributes:   [{ name: String, value: String }],
    stock:        { type: Number, required: true, min: 0 },
    priceOverride: Number,
    image:        String,
    isActive:     { type: Boolean, default: true }
}, { _id: true });

const keyValueSchema = new mongoose.Schema({
    title: String,
    value: String
}, { _id: false });

const productSchema = new mongoose.Schema({
    shop_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    title:          { type: String, required: true, trim: true },
    description:    { type: String, required: true },
    category:       String,
    images:         [String],
    pricing: {
        buyingPrice:  { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        discount:     { type: Number, default: 0, min: 0, max: 100 }
    },
    variants:       { type: [variantSchema], validate: v => v.length > 0 },
    features:       [keyValueSchema],
    specifications: [keyValueSchema],
    comments:       [keyValueSchema],
    isActive:       { type: Boolean, default: true },
    isDeleted:      { type: Boolean, default: false }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sku   = (prefix) => `${prefix}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
const img   = (query) => `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}`;

const SIZES    = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS   = ['White', 'Black', 'Navy', 'Red', 'Grey', 'Green', 'Beige', 'Blue'];
const SHOE_SZ  = ['38', '39', '40', '41', '42', '43', '44'];

/** Build color+size variant grid (picks 3 colors × 3 sizes) */
const clothingVariants = (prefix) => {
    const colors = COLORS.sort(() => 0.5 - Math.random()).slice(0, 3);
    const sizes  = SIZES.slice(1, 4); // S, M, L
    return colors.flatMap(color =>
        sizes.map(size => ({
            sku: sku(prefix),
            attributes: [{ name: 'color', value: color }, { name: 'size', value: size }],
            stock: rand(5, 80),
            isActive: true
        }))
    );
};

/** Build size-only variant for shoes */
const shoeVariants = (prefix) =>
    SHOE_SZ.slice(1, 5).map(size => ({
        sku: sku(prefix),
        attributes: [{ name: 'size', value: size }],
        stock: rand(3, 40),
        isActive: true
    }));

/** Single default variant for electronics / accessories */
const singleVariant = (prefix, colorOptions = null) => {
    const colors = colorOptions || ['Black', 'White', 'Silver'];
    return colors.slice(0, 2).map(color => ({
        sku: sku(prefix),
        attributes: [{ name: 'color', value: color }],
        stock: rand(10, 100),
        isActive: true
    }));
};

// ─── Product definitions ───────────────────────────────────────────────────────
const products = [

    // ── T-Shirts (10) ────────────────────────────────────────────────────────
    ...['Classic Crew Neck T-Shirt', 'Graphic Print T-Shirt', 'Polo T-Shirt',
        'Oversized Drop Shoulder Tee', 'Striped Cotton T-Shirt',
        'V-Neck Basic Tee', 'Acid Wash T-Shirt', 'Longline T-Shirt',
        'Henley Neck T-Shirt', 'Tie-Dye T-Shirt'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `Premium quality ${title.toLowerCase()} made from 100% combed cotton. Breathable, soft, and perfect for everyday wear. Designed for comfort and style in all conditions.`,
        category: 'T-Shirts',
        images: [img('tshirt fashion'), img('tshirt model')],
        pricing: { buyingPrice: rand(150, 250), sellingPrice: rand(350, 650), discount: pick([0, 0, 5, 10]) },
        variants: clothingVariants(`TSH-${i}`),
        features: [
            { title: 'Material', value: '100% Combed Cotton' },
            { title: 'Fit',      value: 'Regular Fit' }
        ],
        specifications: [
            { title: 'Wash Care', value: 'Machine wash cold' },
            { title: 'Origin',   value: 'Made in Bangladesh' }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Shirts (10) ──────────────────────────────────────────────────────────
    ...['Oxford Button-Down Shirt', 'Linen Summer Shirt', 'Flannel Check Shirt',
        'Slim Fit Formal Shirt', 'Casual Denim Shirt', 'Mandarin Collar Shirt',
        'Half-Sleeve Cotton Shirt', 'Patterned Batik Shirt',
        'Double Pocket Cargo Shirt', 'Printed Tropical Shirt'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} crafted from premium fabric. Features a tailored silhouette with quality stitching throughout. Ideal for both casual and semi-formal occasions.`,
        category: 'Shirts',
        images: [img('shirt fashion'), img('shirt model')],
        pricing: { buyingPrice: rand(300, 500), sellingPrice: rand(700, 1400), discount: pick([0, 0, 5, 10, 15]) },
        variants: clothingVariants(`SHT-${i}`),
        features: [
            { title: 'Material', value: 'Premium Cotton Blend' },
            { title: 'Collar',   value: 'Classic Collar' }
        ],
        specifications: [
            { title: 'Wash Care', value: 'Hand wash recommended' },
            { title: 'Occasion',  value: 'Casual / Semi-formal' }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Pants (10) ───────────────────────────────────────────────────────────
    ...['Slim Fit Chino Pants', 'Cargo Jogger Pants', 'Straight Cut Denim Jeans',
        'Linen Trousers', 'Tracksuit Bottoms', 'Pleated Formal Trousers',
        'Slim Fit Denim Jeans', 'Relaxed Fit Khaki', 'Tapered Sweatpants',
        'Corduroy Pants'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} with a modern cut and premium finish. Comfortable for all-day wear with durable stitching and functional pockets.`,
        category: 'Pants',
        images: [img('pants fashion'), img('trouser model')],
        pricing: { buyingPrice: rand(400, 700), sellingPrice: rand(900, 1800), discount: pick([0, 0, 5, 10]) },
        variants: ['28', '30', '32', '34', '36'].map(waist => ({
            sku: sku(`PNT-${i}`),
            attributes: [{ name: 'waist', value: waist }, { name: 'color', value: pick(['Black', 'Navy', 'Khaki', 'Grey']) }],
            stock: rand(5, 50),
            isActive: true
        })),
        features: [
            { title: 'Material', value: 'Cotton Twill' },
            { title: 'Fit',      value: 'Slim / Regular' }
        ],
        specifications: [
            { title: 'Closure', value: 'Zip fly with button' },
            { title: 'Pockets', value: '4 pockets' }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Shoes (10) ───────────────────────────────────────────────────────────
    ...['Classic White Sneakers', 'Leather Oxford Shoes', 'Running Sport Shoes',
        'Canvas Slip-On', 'High-Top Basketball Shoes', 'Suede Loafers',
        'Ankle Boot', 'Sandal Slides', 'Trail Running Shoes', 'Formal Derby Shoes'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} with superior cushioning and durable outsole. Designed for comfort and long-lasting wear whether for everyday use or special occasions.`,
        category: 'Shoes',
        images: [img('shoes sneakers'), img('footwear fashion')],
        pricing: { buyingPrice: rand(600, 1200), sellingPrice: rand(1400, 3500), discount: pick([0, 0, 0, 10, 15]) },
        variants: shoeVariants(`SHO-${i}`),
        features: [
            { title: 'Upper',   value: 'Genuine Leather / Canvas' },
            { title: 'Sole',    value: 'Rubber Outsole' }
        ],
        specifications: [
            { title: 'Closure', value: 'Lace-up' },
            { title: 'Origin',  value: 'Imported' }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Bags (10) ────────────────────────────────────────────────────────────
    ...['Leather Messenger Bag', 'Canvas Backpack', 'Crossbody Mini Bag',
        'Laptop Backpack 15"', 'Tote Shopper Bag', 'Travel Duffel Bag',
        'Fanny Pack Waist Bag', 'Drawstring Gym Bag', 'Business Briefcase',
        'Anti-Theft Backpack'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} with multiple compartments, premium zippers and durable material. Designed for daily commute and travel with organized storage.`,
        category: 'Bags',
        images: [img('bag fashion'), img('backpack accessory')],
        pricing: { buyingPrice: rand(500, 1500), sellingPrice: rand(1200, 4000), discount: pick([0, 0, 5, 10]) },
        variants: singleVariant(`BAG-${i}`, ['Black', 'Brown', 'Navy']),
        features: [
            { title: 'Material', value: 'Premium Canvas / Leather' },
            { title: 'Capacity', value: `${rand(15, 35)}L` }
        ],
        specifications: [
            { title: 'Dimensions', value: `${rand(30, 45)}cm × ${rand(20, 35)}cm × ${rand(10, 20)}cm` },
            { title: 'Pockets',    value: `${rand(3, 7)} compartments` }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Watches (10) ─────────────────────────────────────────────────────────
    ...['Minimalist Analog Watch', 'Chronograph Sport Watch', 'Slim Quartz Watch',
        'Classic Leather Strap Watch', 'Digital Sport Watch', 'Automatic Mechanical Watch',
        'Rose Gold Fashion Watch', 'Waterproof Dive Watch', 'Smart Watch Band',
        'Wooden Face Analog Watch'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} — a timeless addition to any wardrobe. Precision movement, scratch-resistant mineral glass, and a comfortable strap built to last.`,
        category: 'Watches',
        images: [img('watch luxury'), img('wristwatch fashion')],
        pricing: { buyingPrice: rand(800, 3000), sellingPrice: rand(2000, 8000), discount: pick([0, 0, 5, 10, 15]) },
        variants: singleVariant(`WCH-${i}`, ['Silver', 'Gold', 'Black']),
        features: [
            { title: 'Movement',  value: pick(['Quartz', 'Automatic', 'Digital']) },
            { title: 'Glass',     value: 'Mineral Crystal' },
            { title: 'Water Resistance', value: `${pick([30, 50, 100])}m` }
        ],
        specifications: [
            { title: 'Case Diameter', value: `${rand(38, 45)}mm` },
            { title: 'Strap',         value: pick(['Leather', 'Stainless Steel', 'Silicone']) },
            { title: 'Battery Life',  value: '2 years' }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Perfumes (10) ────────────────────────────────────────────────────────
    ...['Oud & Amber Perfume', 'Fresh Aqua Cologne', 'Rose & Jasmine EDP',
        'Woody Cedar Fragrance', 'Citrus Burst EDT', 'Musk Noir Perfume',
        'Sandalwood Attar', 'Vanilla Dreams EDP', 'Arabian Night Oud',
        'Ocean Breeze Cologne'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} — a signature fragrance blending exotic notes for a long-lasting impression. Perfect for all-day wear or special occasions.`,
        category: 'Perfumes',
        images: [img('perfume bottle'), img('fragrance luxury')],
        pricing: { buyingPrice: rand(400, 1200), sellingPrice: rand(1000, 3500), discount: pick([0, 0, 5]) },
        variants: ['50ml', '100ml'].map(size => ({
            sku: sku(`PRF-${i}`),
            attributes: [{ name: 'size', value: size }],
            stock: rand(10, 60),
            priceOverride: size === '50ml' ? undefined : undefined,
            isActive: true
        })),
        features: [
            { title: 'Scent Family', value: pick(['Oriental', 'Floral', 'Fresh', 'Woody', 'Citrus']) },
            { title: 'Longevity',    value: `${rand(6, 12)} hours` },
            { title: 'Sillage',      value: pick(['Moderate', 'Strong', 'Light']) }
        ],
        specifications: [
            { title: 'Concentration', value: pick(['EDP', 'EDT', 'Parfum', 'Attar']) },
            { title: 'Origin',        value: pick(['UAE', 'France', 'Bangladesh']) }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Skincare (10) ────────────────────────────────────────────────────────
    ...['Vitamin C Face Serum', 'Hyaluronic Acid Moisturizer', 'SPF 50 Sunscreen',
        'Niacinamide Brightening Serum', 'Aloe Vera Gel', 'Charcoal Face Wash',
        'Retinol Night Cream', 'Under Eye Cream', 'Clay Purifying Mask',
        'Rose Water Toner'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} formulated with dermatologist-tested ingredients. Suitable for all skin types. Cruelty-free and paraben-free formula for visible results.`,
        category: 'Skincare',
        images: [img('skincare beauty'), img('face serum product')],
        pricing: { buyingPrice: rand(200, 600), sellingPrice: rand(500, 1500), discount: pick([0, 0, 5, 10]) },
        variants: [{
            sku: sku(`SKN-${i}`),
            attributes: [{ name: 'size', value: `${pick([30, 50, 100])}ml` }],
            stock: rand(20, 150),
            isActive: true
        }],
        features: [
            { title: 'Key Ingredient', value: title.split(' ').slice(0, 2).join(' ') },
            { title: 'Skin Type',      value: pick(['All Skin Types', 'Oily', 'Dry', 'Combination']) }
        ],
        specifications: [
            { title: 'Free From', value: 'Paraben, Sulfate, Cruelty-Free' },
            { title: 'Shelf Life', value: '24 months' }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Electronics Accessories (10) ──────────────────────────────────────────
    ...['Wireless Earbuds TWS', 'Type-C Fast Charger 65W', 'Portable Power Bank 20000mAh',
        'Phone Case iPhone 15', 'Tempered Glass Screen Protector',
        'USB-C Hub 7-in-1', 'Magnetic Car Phone Holder', 'Bluetooth Speaker Mini',
        'Laptop Stand Adjustable', 'Mechanical Keyboard TKL'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} — premium quality with enhanced performance. Compatible with all major devices. Includes warranty and full accessories in the box.`,
        category: 'Electronics',
        images: [img('electronics gadget'), img('tech accessory')],
        pricing: { buyingPrice: rand(500, 3000), sellingPrice: rand(1200, 6500), discount: pick([0, 0, 5, 10]) },
        variants: singleVariant(`ELC-${i}`, ['Black', 'White']),
        features: [
            { title: 'Connectivity', value: pick(['Bluetooth 5.3', 'USB-C', 'Wireless', 'Wired']) },
            { title: 'Warranty',     value: '1 Year' }
        ],
        specifications: [
            { title: 'Compatibility', value: 'Universal' },
            { title: 'In the Box',    value: 'Device, Cable, Manual' }
        ],
        isActive: true, isDeleted: false
    })),

    // ── Home & Lifestyle (10) ─────────────────────────────────────────────────
    ...['Ceramic Coffee Mug 350ml', 'Scented Soy Candle', 'Bamboo Desk Organizer',
        'Cotton Throw Pillow Cover', 'Stainless Steel Water Bottle',
        'Minimalist Wall Clock', 'Diffuser with Essential Oils',
        'Linen Table Runner', 'Foldable Storage Box', 'Wooden Photo Frame 5×7'
    ].map((title, i) => ({
        shop_id: SHOP_ID,
        title,
        description: `${title} — thoughtfully designed to elevate your everyday living space. Durable materials with a clean, modern aesthetic that fits any decor style.`,
        category: 'Home & Lifestyle',
        images: [img('home decor lifestyle'), img('interior design product')],
        pricing: { buyingPrice: rand(150, 800), sellingPrice: rand(400, 2000), discount: pick([0, 0, 5, 10]) },
        variants: singleVariant(`HOM-${i}`, ['Natural', 'White', 'Black']),
        features: [
            { title: 'Material', value: pick(['Ceramic', 'Bamboo', 'Stainless Steel', 'Cotton', 'Linen']) },
            { title: 'Style',    value: 'Minimalist Modern' }
        ],
        specifications: [
            { title: 'Dimensions', value: `${rand(10, 40)}cm` },
            { title: 'Care',       value: 'Wipe clean / Dishwasher safe' }
        ],
        isActive: true, isDeleted: false
    }))
];

// ─── Seed runner ──────────────────────────────────────────────────────────────
const seed = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Remove existing products for this shop before re-seeding
        const deleted = await Product.deleteMany({ shop_id: SHOP_ID });
        console.log(`🗑  Cleared ${deleted.deletedCount} existing products for this shop`);

        const inserted = await Product.insertMany(products);
        console.log(`🌱 Seeded ${inserted.length} products successfully`);

        const breakdown = {};
        products.forEach(p => {
            breakdown[p.category] = (breakdown[p.category] || 0) + 1;
        });
        console.log('\n📦 Breakdown by category:');
        Object.entries(breakdown).forEach(([cat, count]) => {
            console.log(`   ${cat.padEnd(22)} ${count} products`);
        });

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
};

seed();