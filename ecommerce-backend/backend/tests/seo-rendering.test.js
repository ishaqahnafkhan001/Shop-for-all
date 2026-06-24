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
    assert.match(seo, /product\.slug \|\| product\._id/);
    assert.match(seo, /export const buildProductJsonLd/);
    assert.match(seo, /"@type":\s*"Product"/);
    assert.match(seo, /priceCurrency:\s*shop\?\.currency \|\| DEFAULT_CURRENCY/);
    assert.match(seo, /DEFAULT_CURRENCY = "BDT"/);
    assert.match(seo, /if \(averageRating > 0 && reviewCount > 0\)/);
    assert.match(seo, /export const buildBreadcrumbJsonLd/);
});

test('homepage, product, and policy routes render server metadata', () => {
    const homepage = readRepo('ecommerce-storefront/src/app/[subdomain]/page.jsx');
    const productPage = readRepo('ecommerce-storefront/src/app/[subdomain]/products/[id]/page.jsx');
    const policyPage = readRepo('ecommerce-storefront/src/app/[subdomain]/policies/[type]/page.jsx');

    assert.match(homepage, /export async function generateMetadata/);
    assert.match(homepage, /getHomepageSeoTitle/);
    assert.match(homepage, /getHomepageCanonicalUrl/);

    assert.match(productPage, /export async function generateMetadata/);
    assert.match(productPage, /buildProductJsonLd/);
    assert.match(productPage, /buildBreadcrumbJsonLd/);
    assert.match(productPage, /isObjectId\(id\)/);
    assert.match(productPage, /redirect\(`\/products\/\$\{initialProduct\.slug\}`\)/);
    assert.match(productPage, /type:\s*'website'/);
    assert.doesNotMatch(productPage, /type:\s*'product'/);

    assert.match(policyPage, /export async function generateMetadata/);
    assert.match(policyPage, /getPolicyCanonicalUrl/);
    assert.match(policyPage, /isIndexable:\s*Boolean\(POLICY_LABELS\[type\] && content\)/);
});

test('sitemap and robots expose only public SEO URLs and noindex private pages', () => {
    const sitemap = readRepo('ecommerce-storefront/src/app/[subdomain]/sitemap.xml/route.js');
    const robots = readRepo('ecommerce-storefront/src/app/[subdomain]/robots.txt/route.js');

    assert.match(sitemap, /fetchStorefrontInfo/);
    assert.match(sitemap, /fetchStorefrontProducts/);
    assert.match(sitemap, /\.filter\(product => product\?\.slug\)/);
    assert.match(sitemap, /getProductCanonicalUrl/);
    assert.match(sitemap, /getPolicyCanonicalUrl/);

    assert.match(robots, /Disallow: \$\{path\}/);
    assert.match(robots, /"\/cart"/);
    assert.match(robots, /"\/checkout"/);
    assert.match(robots, /"\/account"/);
    assert.match(robots, /Sitemap:/);

    ['cart', 'checkout', 'account', 'signup', 'track'].forEach(route => {
        const layout = readRepo(`ecommerce-storefront/src/app/[subdomain]/${route}/layout.jsx`);
        assert.match(layout, /index:\s*false/);
        assert.match(layout, /follow:\s*false/);
    });
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
