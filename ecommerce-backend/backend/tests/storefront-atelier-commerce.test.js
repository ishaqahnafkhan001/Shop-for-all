const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  loadRoutes,
  root
} = require('./helpers/atelier-routes.cjs');
const {
  getPrebuiltThemes,
  resolvePrebuiltTheme
} = require('@scaleup/storefront-theme/prebuilt');
const frozen = require('./fixtures/atelier-legacy/phase4-markup-sha256.json');
const {normalizeTheme,mergeThemePatch,getThemeCssVars} = require('@scaleup/storefront-theme');
let h;
test.before(async () => {
  h = await loadRoutes();
});
const theme = id => resolvePrebuiltTheme({
  presetId: id,
  appliedAt: '2026-01-01T00:00:00Z'
});
const render = (page, extra = {}) => h.render(h.React.createElement(h.ui.Phase4Case, {
  page,
  theme: theme('atelier-editorial'),
  ...extra
}));
for (const preset of getPrebuiltThemes()) for (const page of ['cart', 'checkout', 'policy', 'account', 'register', 'reset', 'dashboard', 'profile', 'security', 'vendor', 'track', 'otp', 'policy-index']) test(preset.id + '/' + page + ': exact original markup retained', async () => {
  const candidate = theme(preset.id);
  let view;
  if (page === 'policy-index') {
    h.ui.setFixtureEnvironment({
      theme: candidate,
      tenant: 'atelier-test-a'
    });
    view = await h.ui.PolicyIndex({
      params: Promise.resolve({
        subdomain: 'atelier-test-a'
      })
    });
  } else view = h.React.createElement(h.ui.Phase4Case, {
    page,
    theme: candidate
  });
  assert.equal(crypto.createHash('sha256').update(h.render(view)).digest('hex'), frozen[preset.id + '/' + page]);
});
test('cart keeps real item/quantity/promo/checkout elements and clearly defers coupon validation', () => {
  const html = render('cart');
  for (const value of ['atelier-cart', 'Order Summary', 'cart-promo-code', 'Increase quantity for Merchant ceramic vessel', 'Remove Merchant ceramic vessel from cart', '/checkout']) assert.ok(html.includes(value), value);
  const controller = fs.readFileSync(path.join(root, 'ecommerce-storefront/src/app/[subdomain]/cart/page.jsx'), 'utf8');
  assert.ok(controller.includes('Coupon saved. It will be validated during checkout.'));
  assert.match(render('cart', {
    scenario: 'empty'
  }), /Your cart is empty/);
});
test('checkout retains required delivery fields, COD, separate consent and actual form submission', () => {
  const html = render('checkout');
  for (const name of ['fullName', 'email', 'phone', 'address', 'city']) assert.ok(html.includes('name="' + name + '"'), name);
  for (const value of ['Inside Dhaka', 'Outside Dhaka', 'Cash on Delivery', 'checkout-policy-consent', 'checkout-summary', 'checkout-fields', 'Place Order']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('PLACE DEMO ORDER'));
  assert.ok(!html.includes('CONCEPT PREVIEW'));
  const candidate = theme('atelier-editorial');
  assert.equal(getThemeCssVars(candidate).colorGroups.checkout.buttonBackground, '#202721');
  assert.equal(getThemeCssVars(candidate).colorGroups.checkout.cardBackground, '#ffffff');
  const merchant = normalizeTheme(mergeThemePatch(candidate, {colors:{checkout:{buttonBackground:'#123456'}}}));
  assert.equal(getThemeCssVars(merchant).colorGroups.checkout.buttonBackground, '#123456');
});
test('OTP busy/input/error states keep all original verification restrictions and accessible errors', () => {
  const base = {
    presentationVariant: 'atelier-editorial',
    open: true,
    otp: '123',
    state: 'otp_input',
    onCancel: () => {},
    onSendCode: () => {},
    onVerifyCode: () => {},
    setOtp: () => {},
    sending: false,
    verifying: false
  };
  const html = h.render(h.React.createElement(h.ui.CheckoutOtpModal, {
    ...base,
    error: 'Invalid fixture code'
  }));
  assert.match(html, /maxLength="6"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /data-atelier-dialog="checkout-otp"/);
  const busy = h.render(h.React.createElement(h.ui.CheckoutOtpModal, {
    ...base,
    otp: '123456',
    state: 'placing_order'
  }));
  assert.ok(!busy.includes('id="checkout-modal-otp"'));
  assert.equal((busy.match(/disabled=""/g) || []).length, 3);
});
test('registration keeps locked identity fields, OTP and resend cooldown; recovery and security remain available', () => {
  const html = render('register');
  for (const id of ['account-full-name', 'account-email', 'account-password', 'account-otp']) assert.ok(html.includes('id="' + id + '"'), id);
  assert.ok(html.includes('Resend in 0:45'));
  assert.ok(html.includes('Verify &amp; Sign Up'));
  assert.ok(render('reset').includes('type="email"'));
  assert.ok(render('security').includes('Update Password'));
  assert.ok(render('profile').includes('customer@example.test'));
  assert.ok(render('vendor').includes('Management Portal'));
});
test('order history and tracking retain eligibility boundaries and disclose no order before access verification', () => {
  const history = render('dashboard');
  assert.ok(history.includes('Order History'));
  assert.ok(history.includes('View order'));
  const track = render('track');
  assert.ok(track.includes('Send access code'));
  assert.ok(!track.includes('Synthetic test address'));
  assert.ok(!track.includes('Customer Reviews'));
  assert.ok(!track.includes('Cancel this order?'));
});
test('all four full policy types, merchant text escaping and unknown-type 404 remain intact', async () => {
  const candidate = theme('atelier-editorial');
  candidate.policies = {
    refund: 'Full merchant refund terms <script>not executable</script>',
    shipping: 'Full merchant shipping terms',
    privacy: 'Full merchant privacy terms',
    terms: 'Full merchant terms and conditions'
  };
  h.ui.setFixtureEnvironment({
    theme: candidate,
    tenant: 'atelier-test-a'
  });
  const html = h.render(await h.ui.PolicyIndex({
    params: Promise.resolve({
      subdomain: 'atelier-test-a'
    })
  }));
  for (const key of ['refund', 'shipping', 'privacy', 'terms']) assert.ok(html.includes('id="' + key + '"'), key);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('policy-contents'));
  await assert.rejects(h.ui.PolicyDetailPage({
    params: Promise.resolve({
      subdomain: 'atelier-test-a',
      type: 'unknown-type'
    })
  }), /NEXT_NOT_FOUND/);
});
test('account decorative assets are local, nonempty and retain exact Figma root dimensions', () => {
  for (const [name, width, height] of [['account-lime.svg', 325, 270], ['account-terracotta.svg', 163, 165]]) {
    const file = path.join(root, 'packages/storefront-renderer/atelier', name);
    assert.ok(fs.statSync(file).size > 0);
    const tag = fs.readFileSync(file, 'utf8').match(/<svg[^>]*>/)[0];
    assert.ok(tag.includes('width="' + width + '"'));
    assert.ok(tag.includes('height="' + height + '"'));
  }
  const css = fs.readFileSync(path.join(root, 'packages/storefront-renderer/atelier/atelier-pages.css'), 'utf8');
  assert.ok(css.includes("url('./account-lime.svg')"));
  assert.ok(css.includes("url('./account-terracotta.svg')"));
  assert.ok(!css.includes('figma.com/api/mcp/asset'));
});
