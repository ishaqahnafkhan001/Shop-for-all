const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const readBackend = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readProject = (file) => fs.readFileSync(path.join(root, '../..', file), 'utf8');

test('admin product edit fetches full product detail instead of list summary route state', () => {
    const editProduct = readProject('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');
    const productList = readProject('ecommerce-admin/src/pages/dashboard/products/ProductList.jsx');

    assert.match(editProduct, /API\.get\(`\/admin\/products\/\$\{id\}`\)/);
    assert.doesNotMatch(editProduct, /state\?\.product/);
    assert.doesNotMatch(editProduct, /useLocation/);
    assert.doesNotMatch(productList, /state:\s*\{\s*product\s*\}/);
});

test('admin product edit normalizes variants, SEO, and product detail arrays for saving', () => {
    const editProduct = readProject('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');

    assert.match(editProduct, /normalizeVariantForEdit/);
    assert.match(editProduct, /normalizeSellingPointRows/);
    assert.match(editProduct, /normalizeKeyValueRows/);
    assert.match(editProduct, /features:\s*normalizeSellingPointRows\(product\.features\)/);
    assert.match(editProduct, /specifications:\s*normalizeKeyValueRows\(product\.specifications\)/);
    assert.match(editProduct, /comments:\s*normalizeKeyValueRows\(product\.comments\)/);
    assert.match(editProduct, /seo:\s*\{[\s\S]*title:\s*product\.seo\?\.title[\s\S]*description:\s*product\.seo\?\.description/);
    assert.match(editProduct, /const body = new FormData\(\)/);
    assert.match(editProduct, /body\.append\('features', JSON\.stringify\(normalizeSellingPointRows\(formData\.features\)\)\)/);
    assert.match(editProduct, /body\.append\('specifications', JSON\.stringify\(normalizeKeyValueRows\(formData\.specifications\)\)\)/);
    assert.match(editProduct, /body\.append\('comments', JSON\.stringify\(normalizeKeyValueRows\(formData\.comments\)\)\)/);
    assert.match(editProduct, /body\.append\('seo', JSON\.stringify\(formData\.seo\)\)/);
    assert.match(editProduct, /body\.append\('existingImages', JSON\.stringify\(formData\.images \|\| \[\]\)\)/);
});

test('admin product detail endpoint remains full product response for edit hydration', () => {
    const controller = readBackend('controllers/productController.js');
    const start = controller.indexOf('exports.getSingleProduct');
    const end = controller.indexOf('exports.createProduct');
    const block = controller.slice(start, end);

    assert.match(block, /Product\.findOne\(\{[\s\S]*_id:\s*req\.params\.id[\s\S]*shop_id:\s*req\.tenantId[\s\S]*isDeleted:\s*false/);
    assert.doesNotMatch(block, /\.select\(/);
    assert.match(block, /res\.status\(200\)\.json\(\{\s*success:\s*true,\s*data:\s*product\s*\}\)/);
});
