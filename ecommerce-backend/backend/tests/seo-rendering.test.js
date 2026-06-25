const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readRepo = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

test('public product detail lookup supports tenant-safe slug and ObjectId fallback', () => {
    const storeController = read('controllers/storeController.js');
    const getSingleProductBlock = storeController.match(/exports\.getSingleProduct[\s\S]*?exports\.getBatchProducts/)?.[0] || '';

    assert.match(getSingleProductBlock, /slugOrId/);
    assert.match(getSingleProductBlock, /shop_id:\s*req\.tenantId/);
    assert.match(getSingleProductBlock, /isDeleted:\s*false/);
    assert.match(getSingleProductBlock, /isActive:\s*true/);
    assert.match(getSingleProductBlock, /status:\s*'Published'/);
    assert.match(getSingleProductBlock, /slug:\s*slugOrId\.toLowerCase\(\)/);
    assert.match(getSingleProductBlock, /mongoose\.Types\.ObjectId\.isValid\(slugOrId\)/);
    assert.match(getSingleProductBlock, /sanitizePublicProduct\(product\)/);
});

test('public review routes resolve product slugs without exposing cross-tenant reviews', () => {
    const reviewController = read('controllers/reviewController.js');

    assert.match(reviewController, /resolvePublicProductId/);
    assert.match(reviewController, /shop_id:\s*shopId/);
    assert.match(reviewController, /slug:\s*raw\.toLowerCase\(\)/);
    assert.match(reviewController, /mongoose\.Types\.ObjectId\.isValid\(raw\)/);
    assert.match(reviewController, /const shopId = req\.tenantId/);
    assert.match(reviewController, /product_id:\s*productId/);
    assert.match(reviewController, /Review\.find\(\{\s*shop_id:\s*shopId,\s*product_id:\s*productId\s*\}\)/);
});

test('storefront SEO helpers build canonical metadata and safe product JSON-LD', () => {
    const seo = readRepo('ecommerce-storefront/src/lib/seo.js');

    assert.match(seo, /export const buildMetadata/);
    assert.match(seo, /alternates:\s*\{\s*canonical:\s*url\s*\}/);
    assert.match(seo, /openGraph/);
    assert.match(seo, /twitter/);
    assert.match(seo, /export const getProductCanonicalUrl/);
    assert.match(seo, /export const getCollectionCanonicalUrl/);
    assert.match(seo, /export const getCollectionSeoTitle/);
    assert.match(seo, /export const getCollectionSeoDescription/);
    assert.match(seo, /export const buildCollectionItemListJsonLd/);
    assert.match(seo, /product\.slug \|\| product\._id/);
    assert.match(seo, /export const buildProductJsonLd/);
    assert.match(seo, /"@type":\s*"Product"/);
    assert.match(seo, /priceCurrency:\s*shop\?\.currency \|\| DEFAULT_CURRENCY/);
    assert.match(seo, /DEFAULT_CURRENCY = "BDT"/);
    assert.match(seo, /if \(averageRating > 0 && reviewCount > 0\)/);
    assert.match(seo, /export const buildBreadcrumbJsonLd/);
    assert.match(seo, /seo\.socialImage/);
    assert.match(seo, /export const isShopSearchVisible/);
    assert.match(seo, /isFollowable = isIndexable/);
    assert.match(seo, /isFollowable = true/);
    assert.match(seo, /follow:\s*Boolean\(isFollowable\)/);
    assert.match(seo, /verification = \{ google: googleSiteVerification \}/);
    assert.match(seo, /getProductImageAlt/);
    assert.match(seo, /imageAltText/);
});

test('homepage, product, and policy routes render server metadata', () => {
    const homepage = readRepo('ecommerce-storefront/src/app/[subdomain]/page.jsx');
    const productPage = readRepo('ecommerce-storefront/src/app/[subdomain]/products/[id]/page.jsx');
    const policyIndexPage = readRepo('ecommerce-storefront/src/app/[subdomain]/policies/page.jsx');
    const policyPage = readRepo('ecommerce-storefront/src/app/[subdomain]/policies/[type]/page.jsx');

    assert.match(homepage, /export async function generateMetadata/);
    assert.match(homepage, /getHomepageSeoTitle/);
    assert.match(homepage, /getHomepageCanonicalUrl/);
    assert.match(homepage, /isShopSearchVisible\(shop\)/);
    assert.match(homepage, /googleSiteVerification/);

    assert.match(productPage, /export async function generateMetadata/);
    assert.match(productPage, /buildProductJsonLd/);
    assert.match(productPage, /buildBreadcrumbJsonLd/);
    assert.match(productPage, /isObjectId\(id\)/);
    assert.match(productPage, /redirect\(`\/products\/\$\{initialProduct\.slug\}`\)/);
    assert.match(productPage, /type:\s*'website'/);
    assert.doesNotMatch(productPage, /type:\s*'product'/);
    assert.match(productPage, /isShopSearchVisible\(shop\)/);
    assert.match(productPage, /googleSiteVerification/);

    assert.match(policyIndexPage, /export async function generateMetadata/);
    assert.match(policyIndexPage, /Store Policies/);
    assert.match(policyIndexPage, /\/policies/);
    assert.match(policyIndexPage, /getPolicyContent/);
    assert.match(policyIndexPage, /isShopSearchVisible\(shop\)/);
    assert.match(policyIndexPage, /googleSiteVerification/);

    assert.match(policyPage, /export async function generateMetadata/);
    assert.match(policyPage, /getPolicyCanonicalUrl/);
    assert.match(policyPage, /isShopSearchVisible\(shop\)/);
    assert.match(policyPage, /isIndexable:\s*Boolean\(POLICY_LABELS\[type\] && content && isShopSearchVisible\(shop\)\)/);
    assert.match(policyPage, /googleSiteVerification/);
});

test('sitemap and robots expose only public SEO URLs and noindex private pages', () => {
    const sitemap = readRepo('ecommerce-storefront/src/app/[subdomain]/sitemap.xml/route.js');
    const robots = readRepo('ecommerce-storefront/src/app/[subdomain]/robots.txt/route.js');

    assert.match(sitemap, /fetchStorefrontInfo/);
    assert.match(sitemap, /fetchStorefrontProducts/);
    assert.match(sitemap, /fetchStorefrontCollections/);
    assert.match(sitemap, /\.filter\(product => product\?\.slug\)/);
    assert.match(sitemap, /getProductCanonicalUrl/);
    assert.match(sitemap, /getCollectionCanonicalUrl/);
    assert.match(sitemap, /collection\?\.slug/);
    assert.match(sitemap, /collection\.productCount/);
    assert.match(sitemap, /getPolicyCanonicalUrl/);
    assert.match(sitemap, /\/policies/);
    assert.match(sitemap, /isShopSearchVisible\(shop\)/);
    assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"><\/urlset>/);

    assert.match(robots, /Disallow: \$\{path\}/);
    assert.match(robots, /"\/cart"/);
    assert.match(robots, /"\/checkout"/);
    assert.match(robots, /"\/account"/);
    assert.match(robots, /"\/search"/);
    assert.match(robots, /"\/preview"/);
    assert.doesNotMatch(robots, /"\/collections"/);
    assert.doesNotMatch(robots, /isShopSearchVisible/);
    assert.doesNotMatch(robots, /if \(!isShopSearchVisible/);
    assert.match(robots, /Sitemap:/);
    assert.match(robots, /catch \{\s*return new Response\("User-agent: \*\\nDisallow: \/\\n"/);

    ['cart', 'checkout', 'account', 'signup', 'track'].forEach(route => {
        const layout = readRepo(`ecommerce-storefront/src/app/[subdomain]/${route}/layout.jsx`);
        assert.match(layout, /index:\s*false/);
        assert.match(layout, /follow:\s*false/);
    });
});

test('admin SEO Phase 2 controls expose store and product SEO guidance without schema changes', () => {
    const seoUtils = readRepo('ecommerce-admin/src/utils/seoHealth.js');
    const seoPreview = readRepo('ecommerce-admin/src/components/seo/SeoPreview.jsx');
    const storeBuilderConstants = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderConstants.jsx');
    const storeBuilderPage = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');
    const addProduct = readRepo('ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx');
    const editProduct = readRepo('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');

    assert.match(seoUtils, /scoreProductSeo/);
    assert.match(seoUtils, /scoreStoreSeo/);
    assert.match(seoUtils, /buildProductSeoPreview/);
    assert.match(seoUtils, /buildStoreSeoPreview/);
    assert.match(seoUtils, /SEO_TITLE_MIN = 50/);
    assert.match(seoUtils, /SEO_DESCRIPTION_MAX = 160/);

    assert.match(seoPreview, /SeoSnippetPreview/);
    assert.match(seoPreview, /SeoHealthCard/);
    assert.match(seoPreview, /SeoLengthHint/);

    assert.match(storeBuilderConstants, /id:\s*'seo'/);
    assert.match(storeBuilderConstants, /label:\s*'SEO and sharing'/);
    assert.match(storeBuilderConstants, /homepageSeo/);

    assert.match(storeBuilderPage, /Homepage SEO title/);
    assert.match(storeBuilderPage, /Default social share image/);
    assert.match(storeBuilderPage, /Facebook page URL/);
    assert.match(storeBuilderPage, /Google Search Console verification code/);
    assert.match(storeBuilderPage, /googleSiteVerification/);
    assert.match(storeBuilderPage, /searchEngineVisibility/);
    assert.match(storeBuilderPage, /Store SEO score/);
    assert.match(storeBuilderPage, /SeoSnippetPreview/);
    assert.match(seoUtils, /Image alt text added/);
    assert.match(seoUtils, /Collection pages ready/);
    assert.match(seoUtils, /Google verification added/);

    assert.match(addProduct, /Generate from product info/);
    assert.match(addProduct, /Product image alt text/);
    assert.match(addProduct, /Product SEO score/);
    assert.match(addProduct, /SeoSnippetPreview/);
    assert.match(addProduct, /Changing the product URL may affect shared links/);

    assert.match(editProduct, /Generate from product info/);
    assert.match(editProduct, /Product image alt text/);
    assert.match(editProduct, /Product SEO score/);
    assert.match(editProduct, /SeoSnippetPreview/);
    assert.match(editProduct, /Changing the product URL may affect shared links/);
});

test('public collection SEO route is tenant-safe and does not add duplicate category routes', () => {
    const appDir = path.join(repoRoot, 'ecommerce-storefront/src/app/[subdomain]');
    const routeFiles = fs.readdirSync(appDir, { withFileTypes: true }).map(entry => entry.name);
    const collectionPage = readRepo('ecommerce-storefront/src/app/[subdomain]/collections/[slug]/page.jsx');
    const collectionClient = readRepo('ecommerce-storefront/src/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx');
    const collectionController = read('controllers/collectionController.js');
    const storefrontRoutes = read('routes/storefrontRoutes.js');
    const productModel = read('models/Product.js');
    const productValidation = read('validations/productValidation.js');
    const storeBuilderController = read('controllers/storeBuilderController.js');

    assert.equal(routeFiles.includes('collections'), true);
    assert.equal(routeFiles.includes('categories'), false);
    assert.match(collectionPage, /export async function generateMetadata/);
    assert.match(collectionPage, /getCollectionCanonicalUrl/);
    assert.match(collectionPage, /buildCollectionItemListJsonLd/);
    assert.match(collectionPage, /isShopSearchVisible\(shop\)/);
    assert.match(collectionPage, /googleSiteVerification/);
    assert.match(collectionClient, /ProductCard/);
    assert.match(collectionClient, /LinkComponent=\{Link\}/);

    assert.match(storefrontRoutes, /\/:subdomain\/collections/);
    assert.match(storefrontRoutes, /\/:subdomain\/collections\/:slug/);
    assert.match(collectionController, /shop_id:\s*req\.tenantId/);
    assert.match(collectionController, /isActive:\s*true/);
    assert.match(collectionController, /status:\s*'Published'/);
    assert.match(collectionController, /sanitizePublicProducts/);
    assert.match(productModel, /imageAltText/);
    assert.match(productValidation, /imageAltText/);
    assert.match(storeBuilderController, /'seo'/);
    assert.match(storeBuilderController, /sanitizeGoogleSiteVerification/);
});

test('storefront product links prefer slugs and product slug backfill is dry-run safe', () => {
    const productCard = readRepo('ecommerce-storefront/src/components/storefront/reference/StorefrontProductCard.jsx');
    const searchModal = readRepo('ecommerce-storefront/src/components/search/SearchModal.jsx');
    const relatedProducts = readRepo('ecommerce-storefront/src/components/product/RelatedProducts.jsx');
    const accountTabs = readRepo('ecommerce-storefront/src/components/account/CustomerTabs.jsx');
    const backfillScript = read('scripts/backfillProductSlugs.js');

    assert.match(productCard, /product\.slug \|\| product\._id/);
    assert.match(searchModal, /product\.slug \|\| product\._id/);
    assert.match(relatedProducts, /item\.slug \|\| item\._id/);
    assert.match(accountTabs, /item\.slug \|\| item\.product\?\.slug/);

    assert.match(backfillScript, /--dry-run/);
    assert.match(backfillScript, /getUniqueSlug/);
    assert.match(backfillScript, /slug:\s*''/);
    assert.match(backfillScript, /MONGO_URI/);
});
