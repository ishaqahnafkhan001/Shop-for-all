import { createPageTemplate, createPageTemplateDocument, PAGE_KINDS } from '@scaleup/storefront-theme/adaptive';
import { normalizeStoredTheme } from '@scaleup/storefront-theme/storage';
import { getProductPresentation, getInitialAttributes, normalizeProduct } from '@scaleup/storefront-renderer/product-data';
import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { getPolicyContent, POLICY_LABELS } from '@scaleup/storefront-renderer/policy-data';

// Code-owned synthetic examples only. No sessions, customer/order queries,
// provider calls or merchant-supplied action/data expressions belong here.
export const PREVIEW_ASSET_ID = 'a11111111111111111111111';
export const PREVIEW_PRODUCT = Object.freeze({ _id: 'b11111111111111111111111', title: 'Handcrafted ceramic vessel',
    description: 'Carefully made for everyday use. হস্তনির্মিত পণ্য।', category: 'Studio collection', images: ['/adaptive-preview.svg'],
    pricing: { sellingPrice: 1200, discount: 10 }, finalPrice: 1080, totalStock: 12, averageRating: 4.5, numReviews: 8,
    variants: [{ _id: 'c11111111111111111111111', stock: 12, attributes: [{ name: 'Size', value: 'Medium' }], pricing: { price: 1200 } }] });
export const PREVIEW_SCENARIOS = Object.freeze({
    home: ['content'], header: ['navigation'], footer: ['policyAccess'],
    product: ['normal', 'variants', 'out-of-stock', 'zero-price', 'missing-image', 'long-title', 'discounted', 'loading', 'missing'],
    category: ['populated', 'empty', 'filtered', 'loading', 'missing'], collection: ['populated', 'empty', 'loading', 'missing'],
    cart: ['populated', 'empty', 'refreshing', 'error'],
    checkout: ['form', 'empty', 'validation-error', 'otp', 'otp-error', 'expired-otp', 'loading', 'submission-failure', 'success'],
    account: ['login', 'registration', 'verification', 'orders', 'profile', 'security', 'loading', 'error'],
    track: ['lookup', 'otp', 'invalid-information', 'verification-error', 'found', 'in-transit', 'delivered', 'cancelled', 'return-eligible', 'return-ineligible'],
    policiesIndex: ['index'], policy: ['shipping', 'refund', 'privacy', 'terms', 'notFound'],
});
const inert = event => event?.preventDefault?.();
const ACTION_NAMES = ['search', 'setQuantity', 'selectVariant', 'addToCart', 'buyNow', 'submit', 'input', 'marketingConsent',
    'applyPromotion', 'removeFromCart', 'policyConsent', 'promotionCode', 'updateQuantity', 'resendOtp', 'cancelOtp', 'sendOtp', 'verifyOtp', 'otp',
    'applyFilters', 'clearFilters', 'setDraftFilters', 'setMobileFiltersOpen', 'updateQuery', 'setPromoCode', 'handleApplyPromo',
    'setIsRegistering', 'setAuthForm', 'onForgotPassword', 'handleAuthSubmit', 'handleSendOTP', 'handleLogout', 'setPassForm', 'handlePasswordReset',
    'handleCancelOrder', 'handleReturnProofImages', 'handleSubmitReturn', 'handleTrackOrder', 'openReturnModal', 'resetOrderAccess',
    'setAccessOtp', 'setCancelNote', 'setCancelOpen', 'setCancelReason', 'setPhone', 'setReturnDescription', 'setReturnOpen', 'setReturnProofImages',
    'setReturnProofVideo', 'setReturnReason', 'setTrackingId', 'toggleReturnItem'];
export const PREVIEW_ACTIONS = Object.freeze({ core: Object.freeze(Object.fromEntries(ACTION_NAMES.map(name => [name, inert]))),
    catalog: Object.freeze({ addToCart: inert, buyNow: inert }) });
const PRODUCT_ACTIONS = Object.freeze({ addProductToCart: inert, buyNow: inert, toggleWishlist: inert, isWishlisted: () => false, variantPicker: null });
// All private/transactional examples below are code-owned. Public catalog input
// may populate optional/catalog blocks; it never supplies sessions or orders.
export function createPreviewCore(pageKind, requestedScenario, { theme, shop = {}, products = [] }) {
    const scenario = PREVIEW_SCENARIOS[pageKind]?.includes(requestedScenario) ? requestedScenario : PREVIEW_SCENARIOS[pageKind]?.[0];
    const presentationVariant = getStorefrontPresentationVariant(theme), atelier = presentationVariant === 'atelier-editorial';
    const product = structuredClone(PREVIEW_PRODUCT), normalized = normalizeProduct(product);
    const line = { ...normalized, cartItemId: 'synthetic-line', quantity: 1, cartPrice: 1080, selectedVariant: product.variants[0] };
    const common = { presentationVariant, atelier };
    if (['home', 'header', 'footer'].includes(pageKind)) return { ...common, theme, shopName: shop.shopName, subdomain: shop.subdomain, preview: true,
        trustedBadge: shop.trustedBadge, shopVerification: shop.shopVerification };
    if (pageKind === 'product') {
        if (scenario === 'long-title') product.title = 'হস্তনির্মিত সংগ্রহ — Thoughtful everyday goods '.repeat(12);
        if (scenario === 'missing-image') product.images = [];
        if (scenario === 'out-of-stock') { product.totalStock = 0; product.variants[0].stock = 0; }
        if (scenario === 'zero-price') { product.pricing = { sellingPrice: 0, discount: 0 }; product.variants = []; product.finalPrice = 0; }
        if (scenario === 'variants') product.variants.push({ ...structuredClone(product.variants[0]), _id: 'c22222222222222222222222', stock: 0, attributes: [{ name: 'Size', value: 'Large' }] });
        const item = normalizeProduct(product), selectedAttributes = getInitialAttributes(item);
        return { ...common, state: ['loading', 'missing'].includes(scenario) ? scenario : 'available', product: item, selectedAttributes,
            ...getProductPresentation(item, selectedAttributes), quantity: 1 };
    }
    if (['category', 'collection'].includes(pageKind)) {
        const items = ['empty', 'filtered'].includes(scenario) ? [] : (products.length ? products : [product]).map(normalizeProduct);
        const filters = { minPrice: '', maxPrice: '', stock: 'all', sale: false, rating: '', sort: 'newest' };
        return { ...common, state: scenario, category: 'Studio collection', categoryImage: '/adaptive-preview.svg', categoryImageAlt: 'Synthetic collection',
            collection: { title: 'Studio collection', description: 'Thoughtfully made objects. হস্তনির্মিত সংগ্রহ।', image: '/adaptive-preview.svg' },
            normalizedProducts: items, filters, draftFilters: filters, activeFilters: scenario === 'filtered' ? [{ key: 'stock', label: 'In stock', updates: { stock: 'all' } }] : [],
            total: items.length, page: 1, totalPages: items.length ? 2 : 1, pagination: { page: 1, totalPages: 2 }, hasRatingData: true,
            gridClass: 'grid-cols-2 lg:grid-cols-3', gridGapClass: 'gap-4', themedProductCard: theme.productCard, productActions: PRODUCT_ACTIONS,
            mobileFiltersOpen: false, filterButtonRef: { current: null }, shop };
    }
    if (pageKind === 'cart') return { ...common, state: scenario, cartItems: scenario === 'empty' ? [] : [line], subtotal: 1080, shipping: 80, totalSavings: 120,
        total: 1160, getCartImageUrl: item => item.images?.[0] || '', promoCode: '', promoFeedback: null, recommendationsLoading: false,
        recommendations: [], themedProductCard: theme.productCard, productActions: PRODUCT_ACTIONS, error: scenario === 'error' ? 'Synthetic cart refresh failed. Please try again.' : '' };
    if (pageKind === 'checkout') return { ...common, state: ['success', 'empty'].includes(scenario) ? scenario : 'form', orderId: 'e11111111111111111111111',
        checkoutBranding: theme.checkoutBranding || {}, formData: { fullName: 'Synthetic Buyer', email: 'buyer@example.test', phone: '01700000000', address: 'Example road', city: 'Inside Dhaka' },
        cartItems: [line], productsDetails: {}, finalShippingCost: 80, subtotal: 1080, totalAmount: 1160, promotionCode: '', promotionDiscount: 0,
        policyAccepted: false, marketingEmailOptIn: false, phoneVerified: false, isDhaka: true, loading: scenario === 'loading',
        error: scenario === 'validation-error' ? 'Please check the delivery details and accept the required store policies.' : scenario === 'submission-failure' ? 'Synthetic submission failure. No order was created.' : '',
        policies: theme.policies, visiblePolicies: [['shipping', 'Shipping'], ['privacy', 'Privacy']],
        otp: { open: ['otp', 'otp-error', 'expired-otp'].includes(scenario), state: 'otp_input', value: '', error: scenario === 'otp-error' ? 'The example code is invalid.' : '',
            message: '', cooldownSeconds: 30, expired: scenario === 'expired-otp', maskedPhone: '017****0000', sending: false, verifying: false } };
    if (pageKind === 'account') return { ...common, state: scenario, authenticated: ['orders', 'profile', 'security'].includes(scenario),
        initialTab: ['profile', 'security'].includes(scenario) ? scenario : 'orders', user: { fullName: 'Synthetic Buyer', email: 'buyer@example.test', role: 'customer' },
        orders: [], isRegistering: ['registration', 'verification'].includes(scenario), authForm: { fullName: 'Synthetic Buyer', email: 'buyer@example.test', password: '', otp: '' },
        otpSent: scenario === 'verification', otpTimer: 30, otpLoading: false, loading: false,
        passForm: { currentPassword: '', newPassword: '', confirmPassword: '' }, passwordScore: 0, passwordsMatch: false,
        error: scenario === 'error' ? 'Synthetic sign-in error. Check your details and try again.' : '' };
    if (pageKind === 'track') {
        const verified = ['found', 'in-transit', 'delivered', 'cancelled', 'return-eligible', 'return-ineligible'].includes(scenario);
        const status = scenario === 'in-transit' ? 'Shipped' : ['delivered', 'return-eligible', 'return-ineligible'].includes(scenario) ? 'Delivered' : scenario === 'cancelled' ? 'Cancelled' : 'Confirmed';
        const order = { _id: 'e11111111111111111111111', status, paymentStatus: 'Pending', paymentMethod: 'COD', createdAt: '2026-01-15T12:00:00Z', updatedAt: '2026-01-15T12:00:00Z',
            totalAmount: 1160, subtotal: 1080, shippingCost: 80, shippingZone: 'Inside Dhaka', canCancel: scenario === 'found', returnEligibility: { reason: 'Example return window is closed.' },
            cancellation: scenario === 'cancelled' ? { reason: 'Ordered by mistake' } : null, timeline: [] };
        return { ...common, state: scenario, accessVerified: verified, order: verified ? order : null, orderAccessToken: verified ? 'synthetic-preview-access' : null,
            orderItems: [{ productId: product, title: product.title, quantity: 1, price: 1080, total: 1080 }], address: { fullName: 'Synthetic Buyer', phone: '01700000000', addressLine: 'Example road', city: 'Dhaka' },
            trackingId: '', phone: '', accessOtp: '', accessOtpMaskedPhone: '017****0000', accessOtpSent: ['otp', 'verification-error'].includes(scenario), loading: false, actionLoading: false,
            steps: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'], currentStepIndex: status === 'Delivered' ? 4 : status === 'Shipped' ? 3 : 1, progressWidth: status === 'Delivered' ? '100%' : '25%',
            canRequestReturn: scenario === 'return-eligible', returnStatusTone: 'slate', cancelOpen: false, cancelNote: '', cancelReason: 'Other', returnOpen: false, returnDescription: '', returnProofImages: [], returnProofVideo: null, returnReason: 'Other', selectedReturnItems: [],
            error: scenario === 'invalid-information' ? 'No example order matches these details.' : scenario === 'verification-error' ? 'The example verification code is invalid.' : '' };
    }
    if (pageKind === 'policiesIndex') return { ...common, policies: theme.policies, storeName: shop.shopName || 'Synthetic Studio' };
    if (pageKind === 'policy') return { ...common, state: scenario === 'notFound' ? scenario : 'content', label: POLICY_LABELS[scenario],
        content: getPolicyContent(theme.policies, scenario, { storeName: shop.shopName || 'Synthetic Studio' }) };
    return common;
}
export function createPreviewBootstrap() {
    const document = createPageTemplateDocument();
    for (const kind of PAGE_KINDS) {
        const id = `preview_${kind}`;
        document.templates[id] = createPageTemplate(id, kind);
        (['header', 'footer'].includes(kind) ? document.globals : document.defaultTemplates)[kind] = id;
    }
    document.templates.preview_home.nodes.home_intro = { type: 'content.text', content: { text: 'Thoughtfully made, for everyday living', kind: 'heading' }, styles: { base: { fontSize: { unit: 'px', value: 28 } }, desktop: { fontSize: { unit: 'px', value: 44 } } } };
    document.templates.preview_home.nodes.home_products = { type: 'catalog.products', source: { kind: 'catalog', limit: 6 } };
    document.templates.preview_home.rootOrder.push('home_intro', 'home_products');
    const theme = normalizeStoredTheme({ version: 5, siteBuilder: document, footer: { text: 'Synthetic Studio — local design workspace.' },
        policies: { shipping: 'Example shipping policy. Orders normally dispatch within three working days.', refund: 'Example refund policy. Contact the store for eligible returns.', privacy: 'Example privacy policy. Customer information is protected.', terms: 'Example store terms. Review your order before confirming.' } });
    const product = structuredClone(PREVIEW_PRODUCT);
    return { shop: { _id: 'd11111111111111111111111', shopName: 'Synthetic Studio', subdomain: 'synthetic-studio', theme, themeRevision: 0,
        searchAliases: [], customDomain: {}, storewideDiscount: 0 },
        adaptiveAvailability: { available: true, reason: 'AUTHORIZED_SYNTHETIC_DEVELOPMENT_PREVIEW' },
        planAccess: { storeBuilderAccess: 'full', features: { storeBuilder: true } }, publication: { revision: 0 }, draft: null,
        products: [product], previewCatalog: { products: [product], productsById: { [product._id]: product } },
        categories: ['Studio collection'], categoryDetails: [], collections: [], reviews: [], revisions: [], themeAvailability: {},
        adaptiveAssets: [{ assetId: PREVIEW_ASSET_ID, url: '/adaptive-preview.svg', width: 800, height: 600, name: 'Synthetic ceramic image' }] };
}
