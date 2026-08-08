const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '../..');
const readBackend = file => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const readRepo = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');

test('category metadata is tenant-scoped and public serialization excludes Cloudinary ownership data', () => {
    const model = readBackend('models/Category.js');
    const controller = readBackend('controllers/categoryController.js');
    const service = require('../services/categories/categoryService');

    assert.match(model, /shop_id/);
    assert.match(model, /categorySchema\.index\(\{ shop_id: 1, normalizedName: 1 \}, \{ unique: true \}\)/);
    assert.match(model, /publicId:[\s\S]*select: false/);
    assert.match(controller, /Category\.find\(\{ shop_id: req\.tenantId \}\)/);
    assert.match(controller, /shop_id: req\.tenantId/);
    assert.match(controller, /Product\.exists\(\{[\s\S]*shop_id: req\.tenantId/);

    const result = service.serializeCategoryDetail({
        _id: 'category-1',
        name: 'Jewellery',
        coverImage: {
            url: 'https://cdn.example.com/category.webp',
            publicId: 'private-cloudinary-id',
            altText: '<b>Jewellery</b>'
        }
    });

    assert.equal(result.name, 'Jewellery');
    assert.equal(result.image, 'https://cdn.example.com/category.webp');
    assert.equal(result.coverImage.url, 'https://cdn.example.com/category.webp');
    assert.equal(Object.hasOwn(result.coverImage, 'publicId'), false);
});

test('category cover routes reuse catalog permissions, feature gates, and validated multipart uploads', () => {
    const routes = readBackend('routes/categoryRoutes.js');
    const controller = readBackend('controllers/categoryController.js');
    const cloudinary = readBackend('config/cloudinary.js');

    assert.match(routes, /router\.use\(protect\)/);
    assert.match(routes, /authorize\('VendorAdmin', 'VendorStaff'\)/);
    assert.match(routes, /requirePermission\('catalogTools'\)/);
    assert.match(routes, /requireShopFeature\('bulkProductTools'\)/);
    assert.match(routes, /router\.get\('\/images', getCategoryProductImages\)/);
    assert.match(routes, /catalogImageUpload\.single\('coverImage'\)/);
    assert.match(cloudinary, /shop_catalog\/\$\{String\(req\?\.tenantId/);
    assert.match(cloudinary, /\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
    assert.match(controller, /getCategoryProductImages/);
    assert.match(controller, /shop_id: req\.tenantId,[\s\S]*category: \{ \$regex:/);
    assert.match(controller, /sourceProductId[\s\S]*shop_id: req\.tenantId/);
    assert.match(controller, /normalizeCategoryKey\(sourceProduct\.category\) !== normalizedName/);
    assert.match(controller, /This photo does not belong to the selected product/);
});

test('collection CRUD supports image uploads and all mutations remain tenant-scoped', () => {
    const routes = readBackend('routes/collectionRoutes.js');
    const controller = readBackend('controllers/collectionController.js');
    const model = readBackend('models/Collection.js');

    assert.match(routes, /router\.post\('\/',[\s\S]*catalogImageUpload\.single\('image'\)/);
    assert.match(routes, /router\.patch\('\/:id',[\s\S]*catalogImageUpload\.single\('image'\)/);
    assert.match(routes, /router\.delete\('\/:id'/);
    assert.match(controller, /Collection\.findOne\(\{[\s\S]*_id: req\.params\.id,[\s\S]*shop_id: req\.tenantId/);
    assert.match(controller, /Collection\.findOneAndDelete\(\{[\s\S]*shop_id: req\.tenantId/);
    assert.match(controller, /Product\.updateMany\([\s\S]*shop_id: req\.tenantId/);
    assert.match(model, /imagePublicId:[\s\S]*select: false/);
});

test('Catalog Tools exposes collection edit/delete and category cover management', () => {
    const catalogTools = readRepo('ecommerce-admin/src/pages/dashboard/CatalogTools.jsx');

    assert.match(catalogTools, /API\.get\('\/admin\/categories'\)/);
    assert.match(catalogTools, /API\.post\('\/admin\/categories\/cover'/);
    assert.match(catalogTools, /API\.get\('\/admin\/categories\/images'/);
    assert.match(catalogTools, /sourceProductId: image\.productId/);
    assert.match(catalogTools, /Choose product photo/);
    assert.match(catalogTools, /API\.delete\(`\/admin\/categories\/\$\{category\._id\}\/cover`\)/);
    assert.match(catalogTools, /API\.patch\(`\/admin\/collections\/\$\{editingCollectionId\}`/);
    assert.match(catalogTools, /API\.delete\(`\/admin\/collections\/\$\{collection\._id\}`/);
    assert.match(catalogTools, /payload\.append\('image', collectionImageFile\)/);
    assert.match(catalogTools, /Category covers/);
    assert.match(catalogTools, /Promise\.allSettled/);
    assert.match(catalogTools, /productsPayload\.categoryDetails/);
    assert.doesNotMatch(catalogTools, /toast\.error\('Failed to load catalog tools'\)/);
});

test('storefront and Store Builder consume enriched categories without replacing legacy filter strings', () => {
    const shopData = readRepo('ecommerce-storefront/src/hooks/useShopData.js');
    const homeClient = readRepo('ecommerce-storefront/src/app/[subdomain]/StorefrontHomeClient.jsx');
    const sharedHome = readRepo('packages/storefront-renderer/reference/StorefrontHome.jsx');
    const categoryVariants = readRepo('packages/storefront-renderer/reference/StorefrontSectionVariants.jsx');
    const categoryPage = readRepo('ecommerce-storefront/src/app/[subdomain]/categories/[slug]/page.jsx');
    const builderPage = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');

    assert.match(shopData, /categoryDetails:/);
    assert.match(homeClient, /categoryDetails=\{categoryDetails\}/);
    assert.match(sharedHome, /categories=\{categoryDetails\.length \? categoryDetails : categories\}/);
    assert.match(sharedHome, /<StorefrontAllProducts[\s\S]*categories=\{categories\}/);
    assert.match(categoryVariants, /category\?\.coverImage\?\.url \|\| category\?\.image/);
    assert.match(categoryPage, /categoryDetail/);
    assert.match(builderPage, /productCategoryDetails/);
});
