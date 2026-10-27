'use strict';
const { fixture, text } = require('./contract-fixtures.cjs');
const { FALLBACK_THEME } = require('../../../../../packages/storefront-theme/index.cjs');
const { COLOR_TOKENS } = require('../../../../../packages/storefront-theme/adaptive.cjs');
const tokens = Object.fromEntries(COLOR_TOKENS.map(key => [key, FALLBACK_THEME.colors[key]]));
const assetId = 'a11111111111111111111111';
const productId = 'b11111111111111111111111';
const px = value => ({ unit: 'px', value });
function renderDocument() {
    const document = fixture(['home', 'product', 'checkout']);
    const home = document.templates.tpl_home;
    home.styles = { base: { fontSize: px(16), color: { hex: '#123456' } }, desktop: { fontSize: px(20) } };
    home.nodes.section_story.styles = { base: { background: { hex: '#fafafa' }, gap: px(12), paddingBlockStart: px(0) } };
    home.nodes.story_text.content = { kind: 'heading', text: 'Synthetic shop: thoughtful everyday goods' };
    home.nodes.story_text.styles = { base: { fontSize: px(24) } };
    home.nodes.section_story.slots.body.push('columns', 'stack');
    Object.assign(home.nodes, {
        columns: { type: 'layout.columns', slots: { columns: ['image', 'column_copy'] },
            styles: { base: { gap: px(16), stackOnMobile: true }, tablet: { columns: 2 }, desktop: { columns: 2 } } },
        image: { type: 'content.image', content: { assetId, alt: 'Synthetic ceramic vessel' },
            styles: { base: { aspectRatio: { width: 4, height: 3 }, borderRadius: px(12) } } },
        column_copy: { ...text('হস্তনির্মিত সংগ্রহ — Carefully made products. '.repeat(7)), styles: { base: { fontSize: px(18) } } },
        stack: { type: 'layout.stack', slots: { body: ['stack_copy', 'decorative'] }, styles: { base: { gap: px(0) } } },
        stack_copy: text('Collection information'),
        decorative: { ...text('Seasonal editorial note'), styles: { base: { visible: false }, desktop: { visible: true } } },
        products: { type: 'catalog.products', source: { kind: 'catalog', limit: 2 } },
        categories: { type: 'catalog.categories', source: { kind: 'categories', limit: 2 } },
    });
    home.rootOrder.push('products', 'categories');
    for (const kind of ['product', 'checkout']) {
        const template = document.templates[`tpl_${kind}`];
        template.rootOrder.push(`${kind}_note`);
        template.nodes[`${kind}_note`] = text('Shipping and support information for this synthetic shop.');
        template.nodes[`core_tpl_${kind}`].partStyles = {
            [kind === 'product' ? 'title' : 'heading']: { base: { fontSize: px(24) }, desktop: { fontSize: px(32) } },
            error: { base: { fontSize: px(16), fontWeight: 700 } },
            primaryButton: { base: { background: { hex: '#ffffff' }, color: { hex: '#111111' }, borderRadius: px(8) } },
        };
    }
    return document;
}
function productData(scenario = 'normal') {
    return { state: 'available', product: { _id: productId, title: scenario === 'long' ? 'হস্তনির্মিত — Long English product title '.repeat(20) : 'Synthetic ceramic vessel',
        images: [], variants: scenario === 'variant' ? [{ _id: 'b22222222222222222222222', isActive: true, attributes: [{ name: 'Color', value: 'Natural' }] }] : [], description: 'Seller-confirmed synthetic product description.', features: [], specifications: [], comments: [] },
        displayStock: scenario === 'soldout' ? 0 : 3, displayFinalPrice: scenario === 'zero' ? 0 : 120,
        displayDiscount: 0, baseOriginalPrice: 120, availableAttributes: scenario === 'variant' ? { Color: ['Natural', 'Unavailable'] } : {}, selectedAttributes: {}, quantity: 1,
        presentationVariant: 'atelier-editorial' };
}
function checkoutData(scenario = 'form') {
    return { state: ['success', 'empty'].includes(scenario) ? scenario : 'form', presentationVariant: 'atelier-editorial',
        orderId: 'c11111111111111111111111', checkoutBranding: {},
        formData: { fullName: 'Synthetic Buyer', email: 'buyer@example.test', phone: '01700000000', address: 'Synthetic road', city: 'Inside Dhaka' },
        cartItems: [{ _id: productId, cartItemId: 'synthetic-line', title: 'Synthetic vessel', quantity: 1, cartPrice: 120 }],
        productsDetails: {}, finalShippingCost: 80, subtotal: 120, totalAmount: 200, promotionCode: '', promotionDiscount: 0,
        policyAccepted: scenario !== 'no-consent', marketingEmailOptIn: false, phoneVerified: false, isDhaka: true,
        loading: scenario === 'busy', error: scenario === 'error' ? 'Synthetic order error' : '',
        policies: { shipping: 'Synthetic shipping policy' }, visiblePolicies: [['shipping', 'Shipping']],
        otp: { open: scenario === 'otp', state: 'otp_input', value: '123', error: 'Synthetic invalid code', message: '',
            cooldownSeconds: 30, expired: false, maskedPhone: '017****0000', sending: false, verifying: false } };
}
function fixtureActions(record = []) {
    const action = name => (...args) => { record.push({ name, count: args.length }); args[0]?.preventDefault?.(); };
    return { core: Object.fromEntries(['setQuantity', 'selectVariant', 'addToCart', 'buyNow', 'submit', 'input', 'marketingConsent',
        'applyPromotion', 'removeFromCart', 'policyConsent', 'promotionCode', 'updateQuantity', 'resendOtp', 'cancelOtp',
        'sendOtp', 'verifyOtp', 'otp'].map(name => [name, action(name)])), catalog: { addToCart: action('catalogAdd'), buyNow: action('catalogBuy') } };
}
function pageData(kind, scenario) {
    return { core: kind === 'product' ? productData(scenario) : kind === 'checkout' ? checkoutData(scenario) : undefined,
        assets: { [assetId]: { url: '/synthetic-ceramic.png', width: 640, height: 480 } },
        sources: { products: { products: [{ _id: productId, title: 'Synthetic catalog product', sellingPrice: 120, stock: 3, images: [] }] },
            categories: { categories: ['Synthetic category'] } } };
}
module.exports = { renderDocument, productData, checkoutData, fixtureActions, pageData, tokens, px, assetId };
