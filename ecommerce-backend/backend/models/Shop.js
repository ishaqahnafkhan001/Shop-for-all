const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
    label: { type: String, trim: true, maxlength: 80 },
    url: { type: String, trim: true, maxlength: 300 },
    isExternal: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    megaMenu: { type: Boolean, default: false },
    children: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { _id: false });

const homepageSectionSchema = new mongoose.Schema({
    id: { type: String, trim: true, maxlength: 80 },
    type: {
        type: String,
        enum: ['Hero', 'FeaturedProducts', 'Collection', 'TextBlock', 'Newsletter', 'Reviews', 'BannerGrid', 'CategoryList', 'Banner', 'PromoBlock', 'BrandShowcase', 'CollectionShowcase'],
        default: 'FeaturedProducts'
    },
    title: { type: String, trim: true, maxlength: 120 },
    isEnabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    mobileSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: true });

const heroSlideSchema = new mongoose.Schema({
    id: { type: String, trim: true, maxlength: 80 },
    enabled: { type: Boolean, default: true },
    desktopImage: { type: String, trim: true, default: '' },
    mobileImage: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, maxlength: 140, default: '' },
    subtitle: { type: String, trim: true, maxlength: 280, default: '' },
    badgeText: { type: String, trim: true, maxlength: 80, default: '' },
    discountText: { type: String, trim: true, maxlength: 80, default: '' },
    primaryCtaText: { type: String, trim: true, maxlength: 80, default: 'Shop Now' },
    primaryCtaLink: { type: String, trim: true, maxlength: 300, default: '#products' },
    secondaryCtaText: { type: String, trim: true, maxlength: 80, default: 'Explore Collection' },
    secondaryCtaLink: { type: String, trim: true, maxlength: 300, default: '#products' }
}, { _id: false });

const colorField = (defaultValue) => ({ type: String, trim: true, default: defaultValue });

const themeColorGroups = {
    brand: {
        primary: colorField('#0f766e'),
        secondary: colorField('#0f172a'),
        accent: colorField('#0f766e'),
        hover: colorField('#115e59'),
        soft: colorField('#ecfdf5'),
        ring: colorField('#ccfbf1')
    },
    header: {
        background: colorField('#ffffff'),
        text: colorField('#0f172a'),
        mutedText: colorField('#64748b'),
        icon: colorField('#0f172a'),
        border: colorField('#e2e8f0'),
        hover: colorField('#0f766e'),
        cartBadgeBackground: colorField('#0f766e'),
        cartBadgeText: colorField('#ffffff')
    },
    hero: {
        background: colorField('#020617'),
        title: colorField('#ffffff'),
        subtitle: colorField('#e2e8f0'),
        overlay: colorField('#020617'),
        primaryButtonBackground: colorField('#ffffff'),
        primaryButtonText: colorField('#0f172a'),
        secondaryButtonBackground: colorField('#ffffff'),
        secondaryButtonText: colorField('#0f172a')
    },
    productCard: {
        background: colorField('#ffffff'),
        border: colorField('#e2e8f0'),
        shadow: colorField('#e2e8f0'),
        title: colorField('#0f172a'),
        category: colorField('#64748b'),
        price: colorField('#0f172a'),
        compareAtPrice: colorField('#94a3b8'),
        saleBadgeBackground: colorField('#dc2626'),
        saleBadgeText: colorField('#ffffff'),
        ratingStar: colorField('#f59e0b'),
        ratingText: colorField('#94a3b8'),
        wishlistIcon: colorField('#64748b'),
        wishlistActive: colorField('#e11d48'),
        addToCartBackground: colorField('#0f766e'),
        addToCartText: colorField('#ffffff'),
        buyNowBackground: colorField('#0f172a'),
        buyNowText: colorField('#ffffff'),
        outOfStockBackground: colorField('#fff1f2'),
        outOfStockText: colorField('#e11d48'),
        stockBackground: colorField('#ecfdf5'),
        stockText: colorField('#047857'),
        variantChipBackground: colorField('#f8fafc'),
        variantChipText: colorField('#475569'),
        variantChipSelectedBackground: colorField('#0f766e'),
        variantChipSelectedText: colorField('#ffffff')
    },
    allProducts: {
        background: colorField('#f8fafc'),
        title: colorField('#0f172a'),
        subtitle: colorField('#64748b'),
        filterBackground: colorField('#ffffff'),
        filterText: colorField('#475569'),
        dropdownBackground: colorField('#ffffff'),
        paginationBackground: colorField('#ffffff'),
        paginationText: colorField('#475569'),
        paginationActiveBackground: colorField('#0f766e'),
        paginationActiveText: colorField('#ffffff')
    },
    sections: {
        background: colorField('#ffffff'),
        title: colorField('#0f172a'),
        subtitle: colorField('#64748b'),
        bannerOverlay: colorField('#020617'),
        bannerText: colorField('#ffffff'),
        faqBackground: colorField('#f8fafc'),
        faqText: colorField('#475569'),
        testimonialBackground: colorField('#f8fafc'),
        testimonialText: colorField('#475569'),
        trustIcon: colorField('#0f766e'),
        trustText: colorField('#475569')
    },
    footer: {
        background: colorField('#ffffff'),
        heading: colorField('#0f172a'),
        text: colorField('#64748b'),
        link: colorField('#0f172a'),
        linkHover: colorField('#0f766e'),
        border: colorField('#e2e8f0'),
        poweredBy: colorField('#94a3b8')
    },
    checkout: {
        background: colorField('#f8fafc'),
        cardBackground: colorField('#ffffff'),
        text: colorField('#0f172a'),
        buttonBackground: colorField('#0f172a'),
        buttonText: colorField('#ffffff'),
        accent: colorField('#0f766e'),
        inputBackground: colorField('#ffffff'),
        inputBorder: colorField('#cbd5e1'),
        inputFocus: colorField('#0f766e'),
        error: colorField('#dc2626'),
        success: colorField('#047857')
    }
};

const shopSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    subdomain: {
        type: String,
        required: [true, 'Subdomain is required'],
        unique: true,
        lowercase: true,
        trim: true,
        minlength: 3,
        maxlength: 40,
        match: [/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens and must start and end with a letter or number']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Suspended'],
        default: 'Approved',
        index: true
    },
    verification: {
        status: {
            type: String,
            enum: ['not_submitted', 'pending', 'approved', 'rejected', 'expired', 'suspended'],
            default: 'not_submitted',
            index: true
        },
        deadline: {
            type: Date,
            default: () => {
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 20);
                return deadline;
            },
            index: true
        },
        approvedAt: Date,
        suspendedAt: Date,
        phoneVerified: { type: Boolean, default: false },
        phoneVerifiedAt: Date,
        registrationOtpChannel: {
            type: String,
            enum: ['email', 'sms', ''],
            default: ''
        },
        isVendorVerified: { type: Boolean, default: false },
        verifiedAt: Date
    },
    suspensionReason: {
        type: String,
        trim: true,
        default: ''
    },
    plan: {
        name: { type: String, default: 'Starter' },
        status: {
            type: String,
            enum: ['Trialing', 'Active', 'PastDue', 'Cancelled'],
            default: 'Trialing'
        },
        trialEndsAt: Date,
        renewsAt: Date,
        productLimit: { type: Number, default: 100 }
    },
    customDomain: {
        domain: { type: String, trim: true, lowercase: true, default: '' },
        status: {
            type: String,
            enum: ['NotConfigured', 'PendingVerification', 'OwnershipVerified', 'RoutingPending', 'Verified', 'Failed'],
            default: 'NotConfigured'
        },
        ownershipVerified: { type: Boolean, default: false },
        routingVerified: { type: Boolean, default: false },
        manuallyVerifiedRouting: { type: Boolean, default: false },
        verifiedAt: Date,
        lastCheckedAt: Date,
        adminNote: { type: String, trim: true, default: '' },
        verificationToken: { type: String, trim: true, default: '' },
        verificationMethod: {
            type: String,
            enum: ['TXT', 'CNAME'],
            default: 'TXT'
        },
        dnsTarget: { type: String, trim: true, lowercase: true, default: '' },
        expectedTxtValue: { type: String, trim: true, default: '' },
        lastDnsCheckStatus: { type: String, trim: true, default: '' },
        lastDnsCheckError: { type: String, trim: true, default: '' },
        lastOwnershipCheckStatus: { type: String, trim: true, default: '' },
        lastRoutingCheckStatus: { type: String, trim: true, default: '' },
        lastDnsRecords: {
            txt: { type: [String], default: [] },
            cname: { type: [String], default: [] },
            a: { type: [String], default: [] }
        },
        planInactive: { type: Boolean, default: false },
        planInactiveAt: Date
    },
    theme: {
        version: { type: Number, default: 2, min: 1 },
        logoUrl: { type: String, default: '' },
        faviconUrl: { type: String, default: '' },
        fontFamily: { type: String, default: 'Inter' },
        productGridStyle: {
            type: String,
            enum: ['Comfortable', 'Compact', 'Spacious', 'Editorial'],
            default: 'Comfortable'
        },
        header: {
            logoPosition: {
                type: String,
                enum: ['Left', 'Center', 'Right'],
                default: 'Left'
            },
            menuStyle: {
                type: String,
                enum: ['Simple', 'Nested', 'Mega'],
                default: 'Simple'
            }
        },
        colors: {
            accent: colorField('#0f766e'),
            accentHover: colorField('#115e59'),
            accentSoft: colorField('#99f6e4'),
            accentBg: colorField('#ecfdf5'),
            accentStrong: colorField('#042f2e'),
            accentMuted: colorField('#14b8a6'),
            accentLight: colorField('#5eead4'),
            accentRing: colorField('#ccfbf1'),
            background: colorField('#ffffff'),
            foreground: colorField('#111827'),
            headerBackground: colorField('#ffffff'),
            primaryButtonBg: colorField('#0f766e'),
            primaryButtonText: colorField('#ffffff'),
            primaryButtonHoverBg: colorField('#115e59'),
            secondaryButtonBg: colorField('#ffffff'),
            secondaryButtonText: colorField('#0f172a'),
            secondaryButtonHoverBg: colorField('#f8fafc'),
            navbarBackground: colorField('#ffffff'),
            navbarText: colorField('#0f172a'),
            navbarHover: colorField('#0f766e'),
            cardBackground: colorField('#ffffff'),
            cardBorder: colorField('#e2e8f0'),
            cardHoverBorder: colorField('#99f6e4'),
            priceColor: colorField('#0f172a'),
            saleBadgeBg: colorField('#dc2626'),
            saleBadgeText: colorField('#ffffff'),
            ratingColor: colorField('#f59e0b'),
            footerBackground: colorField('#ffffff'),
            footerText: colorField('#64748b'),
            footerLink: colorField('#0f172a'),
            ...themeColorGroups
        },
        typography: {
            headingFont: { type: String, default: 'Inter' },
            bodyFont: { type: String, default: 'Inter' },
            baseSize: { type: Number, default: 16, min: 12, max: 20 },
            headingWeight: {
                type: String,
                enum: ['600', '700', '800', '900'],
                default: '800'
            }
        },
        hero: {
            title: { type: String, default: '' },
            subtitle: { type: String, default: '' },
            imageUrl: { type: String, default: '' },
            ctaLabel: { type: String, default: 'Shop Now' },
            ctaUrl: { type: String, default: '/' },
            overlayOpacity: { type: Number, default: 25, min: 0, max: 80 },
            height: {
                type: String,
                enum: ['Compact', 'Medium', 'Tall'],
                default: 'Medium'
            },
            bannerSlides: { type: [heroSlideSchema], default: [] }
        },
        layout: {
            maxWidth: {
                type: String,
                enum: ['Contained', 'Wide', 'Full'],
                default: 'Wide'
            },
            containerWidth: {
                type: String,
                enum: ['Narrow', 'Standard', 'Wide', 'Full Width'],
                default: 'Wide'
            },
            sectionSpacing: {
                type: String,
                enum: ['Compact', 'Comfortable', 'Spacious'],
                default: 'Comfortable'
            },
            contentSpacing: {
                type: String,
                enum: ['Compact', 'Comfortable', 'Spacious'],
                default: 'Comfortable'
            },
            sectionWidth: {
                type: String,
                enum: ['Narrow', 'Standard', 'Wide', 'Full Width'],
                default: 'Full Width'
            },
            sectionPaddingTop: { type: Number, default: 40, min: 0, max: 160 },
            sectionPaddingBottom: { type: Number, default: 40, min: 0, max: 160 },
            sectionMarginTop: { type: Number, default: 0, min: 0, max: 160 },
            sectionMarginBottom: { type: Number, default: 40, min: 0, max: 160 },
            productColumnsDesktop: { type: Number, default: 3, min: 2, max: 5 },
            productColumnsMobile: { type: Number, default: 2, min: 1, max: 2 },
            productGap: {
                type: String,
                enum: ['Compact', 'Comfortable', 'Spacious', 'Editorial'],
                default: 'Comfortable'
            },
            cardAlignment: {
                type: String,
                enum: ['Left', 'Center', 'Right'],
                default: 'Left'
            }
        },
        productCard: {
            style: {
                type: String,
                enum: ['Minimal', 'Modern', 'Premium'],
                default: 'Modern'
            },
            imageFit: {
                type: String,
                enum: ['Contain', 'Cover'],
                default: 'Contain'
            },
            aspectRatio: {
                type: String,
                enum: ['Square', 'Portrait', 'Landscape'],
                default: 'Square'
            },
            imageRadius: {
                type: String,
                enum: ['Soft', 'Rounded', 'Square'],
                default: 'Rounded'
            },
            hoverZoom: { type: Boolean, default: true },
            showCategory: { type: Boolean, default: true },
            showRating: { type: Boolean, default: true },
            showReviews: { type: Boolean, default: true },
            showStock: { type: Boolean, default: true },
            showSku: { type: Boolean, default: false },
            showDiscountBadge: { type: Boolean, default: true },
            showQuickBuy: { type: Boolean, default: true },
            showWishlist: { type: Boolean, default: false },
            borderRadius: {
                type: String,
                enum: ['Soft', 'Rounded', 'Square'],
                default: 'Rounded'
            },
            shadow: {
                type: String,
                enum: ['None', 'Soft', 'Elevated'],
                default: 'Soft'
            },
            titleSize: {
                type: String,
                enum: ['Small', 'Medium', 'Large'],
                default: 'Medium'
            },
            titleWeight: {
                type: String,
                enum: ['600', '700', '800', '900'],
                default: '800'
            },
            priceSize: {
                type: String,
                enum: ['Small', 'Medium', 'Large'],
                default: 'Medium'
            },
            priceColor: { type: String, default: '#0f172a' },
            buttonStyle: {
                type: String,
                enum: ['Solid', 'Outline', 'Ghost'],
                default: 'Solid'
            },
            buttonShape: {
                type: String,
                enum: ['Soft', 'Rounded', 'Pill', 'Square'],
                default: 'Rounded'
            },
            buttonColor: { type: String, default: '#0f766e' }
        },
        checkoutBranding: {
            logoUrl: { type: String, default: '' },
            bannerText: { type: String, default: '' },
            buttonStyle: {
                type: String,
                enum: ['Solid', 'Rounded', 'Pill'],
                default: 'Rounded'
            },
            trustMessage: { type: String, default: 'Secure checkout' }
        },
        mobile: {
            stickyCheckoutButton: { type: Boolean, default: true },
            compactHeader: { type: Boolean, default: true },
            showBottomNavigation: { type: Boolean, default: false }
        },
        paymentSettings: {
            additionalMethodsEnabled: { type: Boolean, default: false },
            providers: {
                stripe: { type: Boolean, default: false },
                sslcommerz: { type: Boolean, default: false },
                bkash: { type: Boolean, default: false },
                nagad: { type: Boolean, default: false },
                rocket: { type: Boolean, default: false },
                paypal: { type: Boolean, default: false }
            }
        },
        seo: {
            title: { type: String, trim: true, maxlength: 70, default: '' },
            description: { type: String, trim: true, maxlength: 170, default: '' },
            socialImage: { type: String, trim: true, default: '' },
            facebookUrl: { type: String, trim: true, default: '' },
            searchEngineVisibility: { type: Boolean, default: true },
            googleSiteVerification: { type: String, trim: true, maxlength: 200, default: '' }
        },
        homepageSections: {
            type: [homepageSectionSchema],
            default: [
                {
                    id: 'featured-products',
                    type: 'FeaturedProducts',
                    title: 'Featured products',
                    sortOrder: 0,
                    isEnabled: true,
                    settings: { source: { type: 'manual', productIds: [] }, productIds: [] }
                }
            ]
        },
        allProducts: {
            title: { type: String, default: 'Shop products' },
            subtitle: { type: String, default: '' },
            isEnabled: { type: Boolean, default: true },
            desktopColumns: { type: Number, default: 3, min: 2, max: 5 },
            tabletColumns: { type: Number, default: 2, min: 1, max: 4 },
            mobileColumns: { type: Number, default: 2, min: 1, max: 2 },
            spacing: {
                type: String,
                enum: ['Compact', 'Comfortable', 'Spacious'],
                default: 'Comfortable'
            }
        },
        migrations: {
            bannerSectionsV1: { type: Boolean, default: false }
        },
        navigation: {
            type: [linkSchema],
            default: [
                { label: 'Shop', url: '/', sortOrder: 0 },
                { label: 'Policies', url: '/policies', sortOrder: 1 },
                { label: 'Track Order', url: '/track', sortOrder: 2 }
            ]
        },
        footer: {
            text: { type: String, default: '' },
            contactLabel: { type: String, trim: true, default: 'Contact store' },
            contactEmail: { type: String, trim: true, default: '' },
            facebookUrl: { type: String, trim: true, default: '' },
            instagramUrl: { type: String, trim: true, default: '' },
            twitterUrl: { type: String, trim: true, default: '' },
            youtubeUrl: { type: String, trim: true, default: '' },
            tiktokUrl: { type: String, trim: true, default: '' },
            links: { type: [linkSchema], default: [] }
        },
        policies: {
            refund: { type: String, default: '' },
            shipping: { type: String, default: '' },
            privacy: { type: String, default: '' },
            terms: { type: String, default: '' }
        }
    },
    featureFlags: {
        storeBuilder: { type: Boolean, default: true },
        coupons: { type: Boolean, default: true },
        analytics: { type: Boolean, default: true },
        customDomain: { type: Boolean, default: false },
        staffAccounts: { type: Boolean, default: true },
        bulkProductTools: { type: Boolean, default: true },
        growthCenter: { type: Boolean, default: true },
        aiAdGenerator: { type: Boolean, default: true },
        customerSection: { type: Boolean, default: true },
        trustSystem: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true },
        scheduledProductPublishing: { type: Boolean, default: true },
        scheduledSales: { type: Boolean, default: true }
    },
    badgeStatus: {
        type: String,
        enum: ['none', 'active', 'revoked'],
        default: 'none',
        index: true
    },
    badgeType: {
        type: String,
        enum: ['trusted_seller', 'verified_seller', ''],
        default: ''
    },
    badgeApprovedAt: Date,
    badgeExpiresAt: Date,
    badgeRevokedAt: Date,
    badgeRevokedReason: {
        type: String,
        trim: true,
        default: ''
    },
    badgePlanInactive: { type: Boolean, default: false },
    badgePlanInactiveAt: Date,
    // ✨ NEW: Storewide Discount Feature
    storewideDiscount: {
        type: Number,
        default: 0, // 0 means no sale is active
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%']
    },
    couriers: {
        pathao: {
            enabled: { type: Boolean, default: false },
            storeId: { type: Number, default: null },
            storeName: { type: String, trim: true, default: '' },
            status: {
                type: String,
                enum: ['NotConfigured', 'Configured', 'Active', 'Disabled'],
                default: 'NotConfigured'
            },
            lastSyncedAt: Date,
            configuredAt: Date
        },
        redx: {
            enabled: { type: Boolean, default: false },
            tokenEncrypted: { type: String, default: '' },
            tokenLast4: { type: String, trim: true, default: '' },
            pickupStoreId: { type: String, trim: true, default: '' },
            pickupStoreName: { type: String, trim: true, default: '' },
            pickupAddress: { type: String, trim: true, default: '' },
            pickupAreaName: { type: String, trim: true, default: '' },
            pickupAreaId: { type: String, trim: true, default: '' },
            status: {
                type: String,
                enum: ['NotConfigured', 'Configured', 'Active', 'Disabled'],
                default: 'NotConfigured'
            },
            lastVerifiedAt: Date,
            configuredAt: Date
        },
        defaultCourier: {
            type: String,
            enum: ['pathao', 'redx', null],
            default: null
        }
    },
    // 🚚 Existing Pathao Courier Integration (kept for backward compatibility)
    pathaoStoreId: {
        type: Number,
        default: null // Null means the vendor hasn't set up their Pathao shipping location yet
    },
    pathaoCredentials: {
        client_id: { type: String, default: null },
        client_secret: { type: String, default: null },
        username: { type: String, default: null },
        password: { type: String, default: null },
        isLive: { type: Boolean, default: false } // True for Hermes (Live), False for Sandbox
    }
}, { timestamps: true });

shopSchema.index({ 'customDomain.domain': 1 }, {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'customDomain.domain': { $type: 'string', $ne: '' } }
});
shopSchema.index({ 'verification.status': 1, 'verification.deadline': 1 });
shopSchema.index({ approvalStatus: 1, isActive: 1 });

module.exports = mongoose.model('Shop', shopSchema);
