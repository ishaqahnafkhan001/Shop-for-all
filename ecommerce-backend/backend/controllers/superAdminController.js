const Shop = require('../models/Shop');
const User = require('../models/User');
const Order = require('../models/Order');
const VendorPlan = require('../models/VendorPlan');
const PlatformAnnouncement = require('../models/PlatformAnnouncement');
const AbuseReport = require('../models/AbuseReport');

exports.getPlatformOverview = async (req, res) => {
    try {
        const [
            shopCount,
            activeShopCount,
            suspendedShopCount,
            customerCount,
            orderStats,
            failedPayments
        ] = await Promise.all([
            Shop.countDocuments(),
            Shop.countDocuments({ isActive: true, approvalStatus: 'Approved' }),
            Shop.countDocuments({ $or: [{ isActive: false }, { approvalStatus: 'Suspended' }] }),
            User.countDocuments({ role: 'Customer' }),
            Order.aggregate([
                {
                    $group: {
                        _id: null,
                        orders: { $sum: 1 },
                        revenue: { $sum: '$pricing.total' }
                    }
                }
            ]),
            Order.countDocuments({ 'payment.status': 'Failed' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                shops: shopCount,
                activeShops: activeShopCount,
                suspendedShops: suspendedShopCount,
                customers: customerCount,
                orders: orderStats[0]?.orders || 0,
                platformRevenue: orderStats[0]?.revenue || 0,
                failedPayments
            }
        });
    } catch (err) {
        console.error('Platform overview error:', err);
        res.status(500).json({ success: false, error: 'Failed to load platform overview' });
    }
};

exports.getShops = async (req, res) => {
    try {
        const shops = await Shop.find()
            .sort({ createdAt: -1 })
            .lean();

        const admins = await User.find({
            role: 'VendorAdmin',
            shop_id: { $in: shops.map(shop => shop._id) }
        }).select('fullName email shop_id').lean();

        const adminByShop = new Map(admins.map(admin => [admin.shop_id.toString(), admin]));

        res.status(200).json({
            success: true,
            data: shops.map(shop => ({
                ...shop,
                owner: adminByShop.get(shop._id.toString()) || null
            }))
        });
    } catch (err) {
        console.error('Get shops error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch shops' });
    }
};

exports.updateShopGovernance = async (req, res) => {
    try {
        const update = {};

        if (req.body.approvalStatus) update.approvalStatus = req.body.approvalStatus;
        if (req.body.isActive !== undefined) update.isActive = req.body.isActive;
        if (req.body.plan) update.plan = req.body.plan;
        if (req.body.featureFlags) update.featureFlags = req.body.featureFlags;
        if (req.body.customDomain) update.customDomain = req.body.customDomain;

        const shop = await Shop.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        res.status(200).json({ success: true, data: shop });
    } catch (err) {
        console.error('Update shop governance error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update shop' });
    }
};

exports.getPlans = async (req, res) => {
    try {
        const plans = await VendorPlan.find().sort({ monthlyPrice: 1 });
        res.status(200).json({ success: true, data: plans });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch plans' });
    }
};

exports.upsertPlan = async (req, res) => {
    try {
        const plan = await VendorPlan.findOneAndUpdate(
            { name: req.body.name },
            req.body,
            { upsert: true, new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to save plan' });
    }
};

exports.getDomains = async (req, res) => {
    try {
        const shops = await Shop.find({
            'customDomain.domain': { $ne: '' }
        }).select('shopName subdomain customDomain').sort({ updatedAt: -1 });

        res.status(200).json({ success: true, data: shops });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch domains' });
    }
};

exports.getFailedPayments = async (req, res) => {
    try {
        const orders = await Order.find({
            'payment.status': 'Failed'
        })
            .populate('shop_id', 'shopName subdomain')
            .populate('customer', 'fullName email')
            .sort({ updatedAt: -1 })
            .limit(100);

        res.status(200).json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch failed payments' });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await PlatformAnnouncement.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: announcements });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
    }
};

exports.createAnnouncement = async (req, res) => {
    try {
        const announcement = await PlatformAnnouncement.create(req.body);
        res.status(201).json({ success: true, data: announcement });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to create announcement' });
    }
};

exports.updateAnnouncement = async (req, res) => {
    try {
        const announcement = await PlatformAnnouncement.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!announcement) return res.status(404).json({ success: false, error: 'Announcement not found' });

        res.status(200).json({ success: true, data: announcement });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to update announcement' });
    }
};

exports.getAbuseReports = async (req, res) => {
    try {
        const reports = await AbuseReport.find()
            .populate('shop_id', 'shopName subdomain')
            .sort({ createdAt: -1 })
            .limit(200);

        res.status(200).json({ success: true, data: reports });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch abuse reports' });
    }
};

exports.updateAbuseReport = async (req, res) => {
    try {
        const report = await AbuseReport.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );

        if (!report) return res.status(404).json({ success: false, error: 'Abuse report not found' });

        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to update abuse report' });
    }
};
