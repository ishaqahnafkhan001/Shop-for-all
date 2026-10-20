const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const {
  loadRoutes,
  root
} = require('./helpers/atelier-routes.cjs');
const {
  getPrebuiltThemes,
  resolvePrebuiltTheme
} = require('@scaleup/storefront-theme/prebuilt');
const baseline = require('./fixtures/atelier-legacy/phase3-markup-sha256.json');
let harness;
test.before(async () => {
  harness = await loadRoutes();
});
const theme = id => resolvePrebuiltTheme({
  presetId: id,
  appliedAt: '2026-01-01T00:00:00Z'
});
const render = (page, id = 'atelier-editorial', extra = {}) => harness.render(harness.React.createElement(harness.ui.Phase3Case, {
  page,
  theme: theme(id),
  ...extra
}));
for (const preset of getPrebuiltThemes()) for (const page of ['product', 'category', 'collection']) test(preset.id + '/' + page + ': exact pre-change markup remains unchanged', () => {
  assert.equal(crypto.createHash('sha256').update(render(page, preset.id)).digest('hex'), baseline[preset.id + '/' + page]);
});
test('product uses merchant content, real media, options, identifiers and editorial related cards', () => {
  const html = render('product');
  for (const value of ['atelier-product', 'Merchant ceramic vessel', 'MCH-NAT', 'TEST-01', 'View product image 2', 'Studio edition', 'Increase quantity', 'Add to Cart', 'Buy now', 'Highlights', 'Buying guide', 'Customer Reviews', 'atelier-related', 'atelier-product-card']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('FORM &amp; FOUND'));
  assert.ok(!html.includes('Verified store item'));
  assert.ok(!html.includes('Tracked local shipping'));
});
test('zero-price variant remains zero; unavailable stock removes purchase and quantity actions', () => {
  const free = render('product', 'atelier-editorial', {
    scenario: 'zero'
  });
  assert.match(free, /৳ 0/);
  assert.match(free, /MCH-ZERO/);
  const sold = render('product', 'atelier-editorial', {
    scenario: 'soldout'
  });
  assert.match(sold, /Currently Unavailable/);
  assert.ok(!sold.includes('aria-label="Increase quantity"'));
  assert.ok(!sold.includes('>Buy now<'));
});
test('missing media and long Bengali content retain readable text without unsafe HTML', () => {
  assert.match(render('product', 'atelier-editorial', {
    scenario: 'no-images'
  }), /Image unavailable/);
  const long = render('product', 'atelier-editorial', {
    scenario: 'long'
  });
  assert.match(long, /হস্তনির্মিত/);
  assert.match(long, /Show more/);
  const p = harness.ui.fixtureProducts[0];
  const view = harness.ui.ProductDetailsView({
    product: {
      ...p,
      title: '<img src=x onerror=alert(1)>'
    },
    displayStock: 0,
    availableAttributes: {},
    selectedAttributes: {},
    quantity: 1,
    setQuantity: () => {},
    presentationVariant: 'atelier-editorial'
  });
  const safe = harness.render(view);
  assert.ok(safe.includes('&lt;img'));
  assert.ok(!safe.includes('<img src="x"'));
});
test('existing product callbacks and quantity limits are forwarded without new commerce state', () => {
  const update = [];
  const add = () => {};
  const buy = () => {};
  const select = () => {};
  const view = harness.ui.ProductDetailsView({
    product: harness.ui.fixtureProducts[0],
    displayStock: 2,
    quantity: 1,
    setQuantity: fn => update.push(fn),
    handleAddToCart: add,
    handleBuyNow: buy,
    handleVariantSelect: select,
    availableAttributes: {},
    selectedAttributes: {},
    presentationVariant: 'atelier-editorial'
  });
  const nodes = [];
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    nodes.push(node);
    walk(node.props?.children);
  };
  walk(view);
  const minus = nodes.find(n => n.props?.['aria-label'] === 'Decrease quantity');
  const plus = nodes.find(n => n.props?.['aria-label'] === 'Increase quantity');
  minus.props.onClick();
  plus.props.onClick();
  assert.equal(update[0](1), 1);
  assert.equal(update[1](2), 2);
  assert.ok(nodes.some(n => n.props?.onAddToCart === add && n.props?.onBuyNow === buy));
  assert.ok(nodes.some(n => n.props?.onSelect === select));
});
test('category preserves actual filters while collection contains only its supported sorting and paging', () => {
  const category = render('category');
  for (const label of ['Minimum price', 'Maximum price', 'Availability', 'On sale', 'Rating', 'Filter products', 'Previous', 'Next', 'atelier-product-card']) assert.ok(category.includes(label), label);
  const collection = render('collection');
  assert.ok(collection.includes('The merchant edit'));
  assert.ok(collection.includes('Collection pagination'));
  assert.ok(!collection.includes('Minimum price'));
  assert.ok(!collection.includes('Filter products'));
  assert.ok(render('category', 'atelier-editorial', {
    scenario: 'empty'
  }).includes('No products in this category yet'));
  assert.ok(render('collection', 'atelier-editorial', {
    scenario: 'empty'
  }).includes('No products in this collection yet'));
});
test('all supporting-page CSS rules require explicit Atelier root identity', () => {
  const requireAdmin = require('node:module').createRequire(path.join(root, 'ecommerce-admin/package.json'));
  const postcss = requireAdmin('postcss');
  const css = fs.readFileSync(path.join(root, 'packages/storefront-renderer/atelier/atelier-pages.css'), 'utf8');
  let duplicateHostRuleCount = 0;
  postcss.parse(css).walkRules(rule => {
    const parentHost = '.sf-presentation:has(> .sf-presentation[data-sf-presentation="atelier-editorial"]) > [data-rht-toaster]';
    if (rule.selector === parentHost) {
      duplicateHostRuleCount++;
      assert.deepEqual(rule.nodes.map(node => [node.prop,node.value]), [['display','none']]);
    } else {
      assert.ok(rule.selector.startsWith('.sf-presentation[data-sf-presentation="atelier-editorial"]'), rule.selector);
    }
  });
  assert.equal(duplicateHostRuleCount, 1, 'Only the explicitly opted-in direct tenant may hide its outer duplicate host');
  assert.ok(!css.includes('!important'));
});
