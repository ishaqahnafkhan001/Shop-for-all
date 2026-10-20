/* Read-only diagnostic probes. No database, network, uploads, or application writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const backend = path.join(root, 'ecommerce-backend/backend');
const { createProductSchema, updateProductSchema } = require(path.join(backend, 'validations/productValidation'));
const { applyVariantOperations, buildSimpleVariant } = require(path.join(backend, 'services/products/productVariantService'));
const Product = require(path.join(backend, 'models/Product'));
const results = [];
const record = (id, observation, detail) => results.push({ id, observation, detail });
const id = '507f1f77bcf86cd799439011';
const imageA = 'https://example.com/a.webp';
const imageB = 'https://example.com/b.webp';
const createBase = {
    title: 'Cotton shirt', description: 'A comfortable cotton shirt.', category: 'Clothing',
    images: [imageA], pricing: { buyingPrice: 50, sellingPrice: 100, discount: 0 }, simpleStock: 12
};

async function main() {
    const metadataPatch = { variants: [{ _id: id, attributes: [{ name: 'size', value: 'M' }], sku: 'SHIRT-M', pricing: { price: 110 }, inventory: { lowStockThreshold: 5, reservedStock: 0, trackQuantity: true, allowOversell: false } }] };
    const metadataValidation = updateProductSchema.validate(metadataPatch, { abortEarly: false });
    assert(metadataValidation.error.details.some(item => item.path.join('.') === 'variants.0.stock'));
    record('P01', 'Existing variant metadata payload is rejected without stock', metadataValidation.error.details.map(item => item.message));

    const simplePatch = updateProductSchema.validate({ variants: [{ _id: id, attributes: [], stock: 12, sku: '' }] }, { abortEarly: false });
    assert(simplePatch.error.details.some(item => item.path.join('.') === 'variants.0.attributes'));
    assert(simplePatch.error.details.some(item => item.path.join('.') === 'variants.0.sku'));
    record('P02', 'Saved simple variant shape is rejected by update schema', simplePatch.error.details.map(item => item.message));

    const hydratedInventory = updateProductSchema.validate({ variants: [{ _id: id, attributes: [{ name: 'size', value: 'M' }], stock: 12, inventory: { lowStockAlertActive: false, lowStockAlertStatus: 'not_triggered', lowStockAlertSentAt: null } }] }, { abortEarly: false });
    assert.equal(hydratedInventory.error.details.filter(item => item.type === 'object.unknown').length, 3);
    record('P03', 'Hydrated inventory alert fields are rejected when echoed on save', hydratedInventory.error.details.map(item => item.message));

    const categoryValidation = createProductSchema.validate({ ...createBase, category: '' });
    assert(categoryValidation.error);
    record('P04', 'Optional category submitted as blank blocks create', categoryValidation.error.details.map(item => item.message));

    const controller = fs.readFileSync(path.join(backend, 'controllers/productController.js'), 'utf8');
    const coverSource = controller.slice(controller.indexOf('const resolveCoverMediaId ='), controller.indexOf('const coverMediaBelongsToProduct ='));
    const cover = vm.runInNewContext(`${coverSource}\nresolveCoverMediaId({ images: [${JSON.stringify(imageA)}, ${JSON.stringify(imageB)}], requestedCover: ${JSON.stringify(imageA)}, coverImageIndex: 1 });`);
    assert.equal(cover, imageA);
    record('P05', 'Persisted cover wins over a newly selected cover index', { requestedIndex: 1, expectedCover: imageB, actualCover: cover });

    const variant = buildSimpleVariant({ stock: 12, pricing: createBase.pricing });
    const { normalizeProduct, getProductPresentation } = await import(pathToFileURL(path.join(root, 'packages/storefront-renderer/normalizeProduct.js')).href);
    const changedProduct = { ...createBase, pricing: { ...createBase.pricing, sellingPrice: 150 }, variants: [variant] };
    const presentation = getProductPresentation(normalizeProduct(changedProduct));
    assert.equal(presentation.displayFinalPrice, 100);
    record('P06', 'Base selling price edit leaves simple variant customer price unchanged', { newBasePrice: 150, savedVariantPrice: variant.pricing.price, displayedPrice: presentation.displayFinalPrice });

    const product = new Product({ shop_id: id, ...createBase, options: [{ name: 'color', values: [{ value: 'red' }] }], variants: [{ attributes: [{ name: 'color', value: 'red' }], stock: 12 }] });
    applyVariantOperations({ product, value: { addAttributeOption: { name: 'color', option: 'blue', defaultStock: 2 } }, oldVariantByKey: new Map() });
    const optionsAfter = product.options[0].values.map(item => item.value);
    const variantOptions = product.variants.map(item => item.attributes[0].value);
    assert(variantOptions.includes('blue'));
    assert(!optionsAfter.includes('blue'));
    const productPresentation = getProductPresentation(normalizeProduct(product.toObject()));
    record('P07', 'Add option changes variants but leaves storefront option definitions stale', { variantOptions, optionDefinitions: optionsAfter, storefrontOptions: productPresentation.availableAttributes });

    const missingStockProduct = new Product({ shop_id: id, ...createBase, variants: [{ _id: id, sku: 'SHIRT-M', attributes: [{ name: 'size', value: 'M' }], stock: 12, inventory: { stock: 12 } }] });
    applyVariantOperations({ product: missingStockProduct, value: metadataPatch, oldVariantByKey: new Map() });
    assert.equal(missingStockProduct.variants[0].stock, 0);
    record('P08', 'Service would reset omitted stock if the schema alone were relaxed', { beforeStock: 12, afterStock: missingStockProduct.variants[0].stock, note: 'Latent service behavior; current HTTP validation rejects this payload first.' });

    const duplicateProduct = new Product({ shop_id: id, ...createBase, variants: [{ attributes: [{ name: 'color', value: 'red' }], stock: 12 }] });
    const duplicatePatch = { variants: [{ attributes: [{ name: 'color', value: 'red' }], stock: 2 }] };
    assert(!updateProductSchema.validate(duplicatePatch).error);
    applyVariantOperations({ product: duplicateProduct, value: duplicatePatch, oldVariantByKey: new Map() });
    assert(!duplicateProduct.validateSync());
    assert.equal(duplicateProduct.variants.length, 2);
    record('P09', 'Duplicate check accepts a combination already present on the product', { resultingVariants: duplicateProduct.variants.map(item => item.attributes.map(a => `${a.name}:${a.value}`).join('|')) });

    const matrix201 = { attributes: [{ name: 'size', options: Array.from({ length: 21 }, (_, i) => `s${i}`) }, { name: 'color', options: Array.from({ length: 10 }, (_, i) => `c${i}`) }], defaultStock: 0 };
    assert(!createProductSchema.validate({ ...createBase, variantMatrix: matrix201 }).error);
    const flat201 = Array.from({ length: 201 }, (_, i) => ({ attributes: [{ name: 'size', value: `s${i}` }], stock: 0 }));
    const flatError = createProductSchema.validate({ ...createBase, variants: flat201 }).error;
    assert(flatError);
    record('P10', 'Matrix and flat variant limits differ', { acceptedMatrixCount: 210, rejectedFlatCount: 201, error: flatError.message });

    const threshold = buildSimpleVariant({ stock: 12, pricing: createBase.pricing, lowStockThreshold: 0 }).inventory.lowStockThreshold;
    assert.equal(threshold, 5);
    record('P11', 'Simple variant threshold zero falls back to five', { requested: 0, actual: threshold });

    const stamp = '2030-11-01T10:00';
    // Use child processes so Node's date parser genuinely observes each server timezone.
    const { execFileSync } = require('node:child_process');
    const parsedTimes = ['UTC', 'Asia/Dhaka'].map(TZ => ({ timezone: TZ, parsed: execFileSync(process.execPath, ['-e', `console.log(new Date(${JSON.stringify(stamp)}).toISOString())`], { env: { ...process.env, TZ }, encoding: 'utf8' }).trim() }));
    assert.notEqual(parsedTimes[0].parsed, parsedTimes[1].parsed);
    record('P12', 'Add-style datetime without offset is interpreted using server timezone', { submitted: stamp, parsedTimes });
    process.stdout.write(`${JSON.stringify({ checkedAt: '2026-10-20', scope: 'Isolated runtime probes; no database or HTTP integration', results }, null, 2)}\n`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
