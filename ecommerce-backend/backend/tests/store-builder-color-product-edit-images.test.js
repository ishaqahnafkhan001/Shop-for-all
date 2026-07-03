const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '../..');
const readBackend = (file) => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const readRepo = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const importStorefrontTheme = () => import(pathToFileURL(path.join(repoRoot, 'ecommerce-storefront/src/lib/theme.js')).href);

test('store builder color controls are centralized in the Colors panel', () => {
    const storeBuilderPage = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');
    const productPanelStart = storeBuilderPage.indexOf('case \'products\'');
    const sectionsPanelStart = storeBuilderPage.indexOf('case \'sections\'', productPanelStart);
    const productPanel = storeBuilderPage.slice(productPanelStart, sectionsPanelStart);

    assert.match(storeBuilderPage, /Quick Setup/);
    assert.match(storeBuilderPage, /Section Colors/);
    assert.match(storeBuilderPage, /Advanced Colors/);
    assert.match(storeBuilderPage, /Product Cards/);
    assert.match(storeBuilderPage, /productCard\.addToCartBackground/);
    assert.match(storeBuilderPage, /productCard\.buyNowBackground/);
    assert.match(storeBuilderPage, /productCard\.variantChipSelectedText/);

    assert.doesNotMatch(productPanel, /type="color"/);
    assert.doesNotMatch(productPanel, /setThemeGroup\('productCard', 'priceColor'/);
    assert.doesNotMatch(productPanel, /setThemeGroup\('productCard', 'buttonColor'/);
    assert.match(productPanel, /Store Layout → Colors → Product Cards/);
});

test('product card renderer lets Color section values override legacy product card colors', async () => {
    const productCard = readRepo('ecommerce-storefront/src/components/storefront/reference/StorefrontProductCard.jsx');
    const { normalizeTheme } = await importStorefrontTheme();

    assert.doesNotMatch(productCard, /productCard\?\.priceColor/);
    assert.doesNotMatch(productCard, /productCard\?\.buttonColor/);

    const oldTheme = normalizeTheme({
        productCard: {
            priceColor: '#123456',
            buttonColor: '#654321'
        }
    });
    assert.equal(oldTheme.colors.productCard.price, '#123456');
    assert.equal(oldTheme.colors.productCard.addToCartBackground, '#654321');

    const authoritativeColorTheme = normalizeTheme({
        colors: {
            productCard: {
                price: '#abcdef',
                addToCartBackground: '#fedcba'
            }
        },
        productCard: {
            priceColor: '#123456',
            buttonColor: '#654321'
        }
    });
    assert.equal(authoritativeColorTheme.colors.productCard.price, '#abcdef');
    assert.equal(authoritativeColorTheme.colors.productCard.addToCartBackground, '#fedcba');
});

test('storefront color groups persist and apply across all storefront page wrappers', () => {
    const shopModel = readBackend('models/Shop.js');
    const themeProvider = readRepo('ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx');
    const storefrontCss = readRepo('ecommerce-storefront/src/app/globals.css');

    assert.match(shopModel, /themeColorGroups/);
    assert.match(shopModel, /productCard:\s*\{[\s\S]*addToCartBackground/);
    assert.match(shopModel, /allProducts:\s*\{[\s\S]*paginationActiveBackground/);
    assert.match(shopModel, /checkout:\s*\{[\s\S]*buttonBackground/);
    assert.match(shopModel, /\.\.\.themeColorGroups/);

    assert.match(themeProvider, /getReferenceThemeStyle\(theme\)/);
    assert.match(themeProvider, /'--sf-surface'/);
    assert.match(themeProvider, /'--sf-border'/);
    assert.match(themeProvider, /'--sf-success'/);
    assert.match(themeProvider, /'--sf-danger'/);

    assert.match(storefrontCss, /var\(--sf-background/);
    assert.match(storefrontCss, /var\(--sf-surface-subtle/);
    assert.match(storefrontCss, /var\(--sf-surface/);
});

test('product edit image updates preserve kept images and submit new files through multipart contract', () => {
    const editProduct = readRepo('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');
    const adminRoutes = readBackend('routes/adminRoutes.js');
    const productController = readBackend('controllers/productController.js');
    const productMediaService = readBackend('services/products/productMediaService.js');

    assert.match(editProduct, /newImageFiles/);
    assert.match(editProduct, /newImagePreviews/);
    assert.match(editProduct, /removedImages/);
    assert.match(editProduct, /Product images/);
    assert.match(editProduct, /Make cover/);
    assert.match(editProduct, /body = new FormData\(\)/);
    assert.match(editProduct, /body\.append\('existingImages'/);
    assert.match(editProduct, /body\.append\('removedImages'/);
    assert.match(editProduct, /body\.append\('coverImageIndex'/);
    assert.match(editProduct, /newImageFiles\.forEach\(file => body\.append\('images', file\)\)/);
    assert.match(editProduct, /newImageFiles\[0\][\s\S]*formData\.images\?\.find/);

    assert.match(adminRoutes, /router\.patch\([\s\S]*'\/products\/:id'[\s\S]*productMediaUpload[\s\S]*updateProduct/);
    assert.match(productMediaService, /'existingImages'/);
    assert.match(productMediaService, /'removedImages'/);
    assert.match(productMediaService, /'coverImageIndex'/);
    assert.match(productController, /hasImageUpdateIntent/);
    assert.match(productController, /currentImages\.includes\(imageUrl\)/);
    assert.match(productController, /parsedBody\.images = finalImages/);
    assert.match(productController, /finalImages\.splice\(coverImageIndex, 1\)/);
});
