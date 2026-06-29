const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const AnalyticsEvent = require('../models/AnalyticsEvent');

const hasText = (value) => Boolean(String(value || '').trim());

const hasMeaningfulStorefrontCustomization = (theme = {}) => {
    const heroSlides = Array.isArray(theme.hero?.bannerSlides) ? theme.hero.bannerSlides : [];
    const homepageSections = Array.isArray(theme.homepageSections) ? theme.homepageSections : [];
    const navigation = Array.isArray(theme.navigation) ? theme.navigation : [];
    const footerLinks = Array.isArray(theme.footer?.links) ? theme.footer.links : [];
    const policies = theme.policies || {};

    return Boolean(
        hasText(theme.logoUrl) ||
        hasText(theme.hero?.title) ||
        hasText(theme.hero?.subtitle) ||
        hasText(theme.hero?.imageUrl) ||
        heroSlides.some(slide => hasText(slide?.desktopImage) || hasText(slide?.mobileImage) || hasText(slide?.title)) ||
        homepageSections.some(section => section?.isEnabled !== false) ||
        navigation.length > 2 ||
        hasText(theme.footer?.text) ||
        footerLinks.length > 0 ||
        Object.values(policies).some(hasText)
    );
};

exports.getVendorOnboarding = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const [shop, productCount, productWithImagesCount, couponCount, analyticsEvent] = await Promise.all([
            Shop.findById(shopId)
                .select('shopName subdomain theme pathaoStoreId couriers verification createdAt updatedAt')
                .lean(),
            Product.countDocuments({ shop_id: shopId, isDeleted: false }),
            Product.countDocuments({ shop_id: shopId, isDeleted: false, 'images.0': { $exists: true } }),
            Promotion.countDocuments({ shop_id: shopId }),
            AnalyticsEvent.exists({ shop_id: shopId })
        ]);

        if (!shop) {
            return res.status(404).json({ success: false, error: 'Shop not found' });
        }

        const verificationStatus = shop.verification?.status || 'not_submitted';
        const storefrontCustomized = hasMeaningfulStorefrontCustomization(shop.theme || {});

        return res.status(200).json({
            success: true,
            data: {
                signals: {
                    profileComplete: hasText(shop.shopName) && hasText(shop.subdomain),
                    logoUploaded: hasText(shop.theme?.logoUrl),
                    nidSubmitted: ['pending', 'approved'].includes(verificationStatus),
                    firstProductAdded: productCount > 0,
                    productImagesAdded: productWithImagesCount > 0,
                    shippingConfigured: Boolean(
                        shop.pathaoStoreId ||
                        shop.couriers?.pathao?.storeId ||
                        (shop.couriers?.redx?.enabled && shop.couriers?.redx?.pickupStoreId)
                    ),
                    refundPolicyAdded: hasText(shop.theme?.policies?.refund),
                    storefrontCustomized,
                    storefrontPublished: storefrontCustomized,
                    firstCouponCreated: couponCount > 0,
                    growthTrafficStarted: Boolean(analyticsEvent)
                },
                counts: {
                    products: productCount,
                    productsWithImages: productWithImagesCount,
                    coupons: couponCount,
                    analyticsEvents: analyticsEvent ? 1 : 0
                },
                verification: {
                    status: verificationStatus,
                    deadline: shop.verification?.deadline || null,
                    approvedAt: shop.verification?.approvedAt || null,
                    suspendedAt: shop.verification?.suspendedAt || null
                }
            }
        });
    } catch (err) {
        console.error('Vendor onboarding error:', err);
        return res.status(500).json({ success: false, error: 'Failed to load onboarding checklist' });
    }
};
