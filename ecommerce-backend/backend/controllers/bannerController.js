const Banner = require('../models/Banner');

// @desc    Create new banner with multiple images (Admin Only)
exports.createBanner = async (req, res) => {
    try {
        const { title, link } = req.body;

        // 🔹 1. Extract shop ID from the authenticated user
        // Adjust 'req.user.shopId' to whatever your auth middleware provides!
        const shop_id = req.user.shopId;

        if (!shop_id) {
            return res.status(401).json({ success: false, message: "Unauthorized: Shop ID missing" });
        }

        // Check if files exist
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded" });
        }

        const imageUrls = req.files.map(file => file.path);

        const newBanner = await Banner.create({
            shop_id, // ✅ Save the banner to this specific shop
            title,
            link,
            images: imageUrls,
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: "Banner uploaded successfully!",
            data: newBanner
        });
    } catch (error) {
        console.error("Banner Upload Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all banners (For Admin Panel Table)
exports.getAllBanners = async (req, res) => {
    try {
        // 🔹 2. Only fetch banners belonging to the logged-in admin's shop
        const shop_id = req.user.shopId;

        const banners = await Banner.find({ shop_id }).sort({ createdAt: -1 });
        res.status(200).json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get active banners (For Public Storefront)
// @desc    Get active banners (For Public Storefront)
exports.getActiveBanners = async (req, res) => {
    try {
        // 🔹 1. Read the ID securely attached by your resolveTenant middleware
        const shop_id = req.tenantId;

        if (!shop_id) {
            return res.status(400).json({
                success: false,
                message: "Tenant resolution failed. Shop ID missing."
            });
        }

        // 🔹 2. Fetch only ACTIVE banners belonging to THIS specific shop
        const banners = await Banner.find({ shop_id, isActive: true });

        res.status(200).json(banners);
    } catch (error) {
        console.error("Fetch Active Banners Error:", error);
        res.status(500).json({ message: error.message });
    }
};
// @desc    Delete banner
exports.deleteBanner = async (req, res) => {
    try {
        // 🔹 4. Security Check: Find the banner by BOTH its ID and the Admin's Shop ID
        // This prevents Admin A from sending a DELETE request with Admin B's banner ID.
        const shop_id = req.user.shopId;

        const banner = await Banner.findOneAndDelete({ _id: req.params.id, shop_id });

        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found or unauthorized" });
        }

        res.status(200).json({ success: true, message: "Banner removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle banner visibility (Active/Inactive)
exports.toggleBannerStatus = async (req, res) => {
    try {
        // 🔹 5. Security Check: Only allow toggling if the banner belongs to the admin
        const shop_id = req.user.shopId;

        const banner = await Banner.findOne({ _id: req.params.id, shop_id });

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found or unauthorized"
            });
        }

        banner.isActive = !banner.isActive;
        await banner.save();

        res.status(200).json({
            success: true,
            message: `Banner is now ${banner.isActive ? 'Active' : 'Inactive'}`,
            data: banner
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};