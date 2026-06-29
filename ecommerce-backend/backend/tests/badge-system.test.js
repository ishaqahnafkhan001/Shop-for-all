const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    BADGE_THRESHOLDS,
    hasFacebookLink
} = require('../services/badges/badgeEligibilityService');

const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readRepo = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

test('badge eligibility thresholds match trusted seller business rules', () => {
    assert.equal(BADGE_THRESHOLDS.minShopAgeDays, 60);
    assert.equal(BADGE_THRESHOLDS.minCompletedSales, 100);
    assert.equal(BADGE_THRESHOLDS.minAverageRating, 4.0);
    assert.equal(BADGE_THRESHOLDS.minReviewCount, 20);
    assert.equal(BADGE_THRESHOLDS.maxUnresolvedAbuseReports, 0);

    assert.equal(hasFacebookLink({
        theme: {
            navigation: [{ label: 'Facebook', url: 'https://facebook.com/example-store' }],
            footer: { links: [] }
        }
    }), true);
    assert.equal(hasFacebookLink({
        theme: {
            navigation: [],
            footer: { facebookUrl: 'https://facebook.com/example-store', links: [] }
        }
    }), true);
    assert.equal(hasFacebookLink({
        theme: {
            navigation: [],
            footer: { links: [{ label: 'Instagram', url: 'https://instagram.com/example-store' }] }
        }
    }), false);
});

test('badge model and shop badge fields support manual Super Admin lifecycle', () => {
    const applicationModel = read('models/BadgeApplication.js');
    const shopModel = read('models/Shop.js');

    assert.match(applicationModel, /pending_analysis/);
    assert.match(applicationModel, /analyzing/);
    assert.match(applicationModel, /pending_super_admin_review/);
    assert.match(applicationModel, /approved/);
    assert.match(applicationModel, /rejected/);
    assert.match(applicationModel, /revoked/);
    assert.match(applicationModel, /eligibilitySnapshot/);
    assert.match(applicationModel, /analysisScore/);
    assert.match(applicationModel, /recommendation/);
    assert.match(applicationModel, /badgeApplicationSchema\.index\(\{ shopId:\s*1,\s*status:\s*1,\s*createdAt:\s*-1 \}\)/);

    assert.match(shopModel, /badgeStatus/);
    assert.match(shopModel, /badgeApprovedAt/);
    assert.match(shopModel, /badgeRevokedReason/);
});

test('vendor badge routes are protected and request submission is VendorAdmin-only', () => {
    const app = read('app.js');
    const routes = read('routes/badgeRoutes.js');

    assert.match(app, /app\.use\('\/api\/admin\/badges',\s*badgeRoutes\)/);
    assert.match(routes, /router\.use\(protect\)/);
    assert.match(routes, /router\.use\(authorize\('VendorAdmin',\s*'VendorStaff'\)\)/);
    assert.match(routes, /router\.get\('\/status',\s*getVendorBadgeStatus\)/);
    assert.match(routes, /router\.post\('\/request',\s*authorize\('VendorAdmin'\),\s*requestVendorBadge\)/);
    assert.match(routes, /router\.get\('\/applications',\s*getVendorBadgeApplications\)/);
});

test('vendor badge request queues background analysis instead of doing heavy analysis synchronously', () => {
    const controller = read('controllers/badgeController.js');
    const requestBlock = controller.match(/exports\.requestVendorBadge[\s\S]*?exports\.getVendorBadgeApplications/)?.[0] || '';

    assert.match(requestBlock, /getBadgeEligibility\(shopId\)/);
    assert.match(requestBlock, /BADGE_NOT_ELIGIBLE/);
    assert.match(requestBlock, /status:\s*'pending_analysis'/);
    assert.match(requestBlock, /await enqueueBadgeAnalysis\(application\)/);
    assert.match(requestBlock, /res\.status\(202\)/);
    assert.doesNotMatch(requestBlock, /processBadgeAnalysisJob/);
});

test('background badge analysis scores applications and notifies Super Admin review', () => {
    const service = read('services/badges/badgeAnalysisService.js');
    const worker = read('workers/index.js');

    assert.match(service, /scoreSnapshot/);
    assert.match(service, /NID verified/);
    assert.match(service, /active Growth\/Pro subscription/);
    assert.match(service, /delivered sales history/);
    assert.match(service, /status = 'pending_super_admin_review'/);
    assert.match(service, /notifySuperAdmins/);
    assert.match(service, /createNotification/);
    assert.match(worker, /badges:\s*processBadgeAnalysisJob/);
    assert.match(worker, /markBadgeAnalysisFailed/);
});

test('Super Admin badge routes require SuperAdmin and reason-gate negative decisions', () => {
    const superRoutes = read('routes/superAdminRoutes.js');
    const badgeRoutes = read('routes/superAdminBadgeRoutes.js');
    const controller = read('controllers/badgeController.js');

    assert.match(superRoutes, /router\.use\('\/badges',\s*superAdminBadgeRoutes\)/);
    assert.match(superRoutes, /router\.use\(authorize\('SuperAdmin'\)\)/);
    assert.match(badgeRoutes, /router\.patch\('\/:id\/approve',\s*approveBadgeApplication\)/);
    assert.match(badgeRoutes, /router\.patch\('\/:id\/reject',\s*rejectBadgeApplication\)/);
    assert.match(badgeRoutes, /router\.patch\('\/:id\/revoke',\s*revokeBadgeApplication\)/);
    assert.match(badgeRoutes, /router\.post\('\/:id\/rerun-analysis',\s*rerunBadgeAnalysis\)/);
    assert.match(controller, /Reason is required to reject badge application/);
    assert.match(controller, /Reason is required to revoke badge/);
    assert.match(controller, /badge\.approved/);
    assert.match(controller, /badge\.rejected/);
    assert.match(controller, /badge\.revoked/);
});

test('public storefront only exposes active trusted badge after verification and active subscription checks', () => {
    const controller = read('controllers/storeController.js');
    const header = readRepo('ecommerce-storefront/src/components/storefront/reference/StorefrontHeader.jsx');
    const navbar = readRepo('ecommerce-storefront/src/components/storefront/Navbar.jsx');

    assert.match(controller, /getPublicTrustedBadge/);
    assert.match(controller, /shop\.badgeStatus !== 'active'/);
    assert.match(controller, /shop\.verification\?\.status !== 'approved'/);
    assert.match(controller, /Subscription\.findOne\(\{[\s\S]*status:\s*'active'/);
    assert.match(controller, /shop\.trustedBadge = await getPublicTrustedBadge\(shop\)/);
    assert.match(controller, /delete shop\.badgeStatus/);
    assert.match(controller, /delete shop\.verification/);

    assert.match(header, /TrustedBadge/);
    assert.match(header, /ShieldCheck/);
    assert.match(header, /Verified by ScaleUp/);
    assert.match(navbar, /trustedBadge=\{shopSettings\?\.trustedBadge\}/);
});

test('admin UI exposes vendor and Super Admin badge pages without changing API shape', () => {
    const app = readRepo('ecommerce-admin/src/App.jsx');
    const sidebar = readRepo('ecommerce-admin/src/components/dashboard/Sidebar.jsx');
    const vendorPage = readRepo('ecommerce-admin/src/pages/dashboard/TrustedBadge.jsx');
    const superPage = readRepo('ecommerce-admin/src/pages/superadmin/SuperAdminBadges.jsx');

    assert.match(app, /dashboard\/TrustedBadge/);
    assert.match(app, /superadmin\/SuperAdminBadges/);
    assert.match(app, /path="badges" element=\{withSuspense\(<TrustedBadge \/>/);
    assert.match(app, /path="badges" element=\{withSuspense\(<SuperAdminBadges \/>/);
    assert.match(sidebar, /Trusted Badge/);
    assert.match(sidebar, /Trusted Badges/);
    assert.match(vendorPage, /\/admin\/badges\/status/);
    assert.match(vendorPage, /\/admin\/badges\/request/);
    assert.match(superPage, /\/super-admin\/badges/);
    assert.match(superPage, /\/:id\/reject|reject/);
    assert.match(superPage, /\/:id\/revoke|revoke/);
});
