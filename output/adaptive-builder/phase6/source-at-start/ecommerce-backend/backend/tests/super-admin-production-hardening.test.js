const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    redactAuditMetadata,
    serializeAbuseReportSummary,
    serializeJobSummary,
    serializePaymentSummary,
    serializePlatformAuditEvent,
    serializeReconciliationSummary,
    serializeSuperAdminShopDetail,
    serializeSuperAdminShopListItem,
    serializeVerificationSummary
} = require('../services/superAdmin/superAdminSerializers');
const { normalizeAuditIntent } = require('../services/platformAuditOutboxService');
const {
    hasPlatformPermission,
    isPlatformRole
} = require('../config/platformPermissions');
const { getReportingMonthRange } = require('../controllers/billingController');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const adminRoot = path.resolve(root, '..', '..', 'ecommerce-admin', 'src');
const readAdmin = file => fs.readFileSync(path.join(adminRoot, file), 'utf8');

const FORBIDDEN_RESPONSE_KEYS = new Set([
    'accessToken',
    'authorization',
    'credential',
    'documentUrl',
    'encryptionKey',
    'nidBackUrl',
    'nidFrontUrl',
    'nidNumberRaw',
    'password',
    'pathaoClientSecret',
    'pathaoPassword',
    'publicId',
    'redxToken',
    'refreshToken',
    'screenshotUrl',
    'secret',
    'storageKey',
    'token',
    'webhookSecret'
].map(key => key.toLowerCase()));

const collectForbiddenKeys = (value, found = [], trail = []) => {
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectForbiddenKeys(item, found, [...trail, index]));
        return found;
    }
    if (!value || typeof value !== 'object') return found;
    Object.entries(value).forEach(([key, nested]) => {
        if (FORBIDDEN_RESPONSE_KEYS.has(key.toLowerCase())) found.push([...trail, key].join('.'));
        collectForbiddenKeys(nested, found, [...trail, key]);
    });
    return found;
};

test('purpose-specific Super Admin serializers omit protected shop and payment fields', () => {
    const unsafeShop = {
        _id: 'shop-1',
        shopName: 'Safe Shop',
        subdomain: 'safe-shop',
        redxToken: 'redx-secret',
        pathao: {
            clientSecret: 'pathao-secret',
            accessToken: 'pathao-token',
            refreshToken: 'refresh-token'
        },
        courierCredentials: { password: 'secret' },
        customDomain: {
            domain: 'shop.example.com',
            status: 'Verified',
            verificationToken: 'dns-secret'
        }
    };
    const payment = serializePaymentSummary({
        _id: 'payment-1',
        senderNumber: '01312349765',
        screenshotUrl: 'https://storage.example/proof.jpg',
        provider: 'manual_bkash',
        amount: 499,
        status: 'pending'
    });

    assert.deepEqual(collectForbiddenKeys(serializeSuperAdminShopListItem(unsafeShop)), []);
    assert.deepEqual(collectForbiddenKeys(serializeSuperAdminShopDetail(unsafeShop)), []);
    assert.deepEqual(collectForbiddenKeys(payment), []);
    assert.equal(payment.proofAvailable, true);
    assert.equal(payment.senderNumber, '013****9765');
});

test('operational serializers never expose job payloads, locks, reporters, or raw reconciliation metadata', () => {
    const job = serializeJobSummary({
        _id: 'job-1',
        queue: 'billing',
        name: 'reconcile-subscription',
        status: 'failed',
        payload: {
            accessToken: 'secret-token',
            providerPayload: { customer: 'private' }
        },
        lockId: 'private-lock-id',
        lastError: 'Provider temporarily unavailable'
    });
    const reconciliation = serializeReconciliationSummary({
        _id: 'subscription-1',
        status: 'active',
        reconciliation: {
            status: 'failed',
            summary: {
                accessToken: 'secret-token',
                callbackUrl: 'https://private.example/callback'
            }
        }
    });
    const riskCase = serializeAbuseReportSummary({
        _id: 'risk-1',
        reporterEmail: 'reporter@example.com',
        reason: 'Suspicious storefront',
        status: 'Open'
    });

    assert.equal(job.hasPayload, true);
    assert.equal('payload' in job, false);
    assert.equal('lockId' in job, false);
    assert.equal(reconciliation.summary.accessToken, '[REDACTED]');
    assert.equal(reconciliation.summary.callbackUrl, '[REDACTED_URL]');
    assert.equal(riskCase.reporterEmail, '');
    assert.equal(riskCase.reporterAvailable, true);
    assert.deepEqual(collectForbiddenKeys({ job, riskCase }), []);
    assert.doesNotMatch(JSON.stringify(reconciliation), /secret-token|private\.example/);
});

test('sensitive credentials and operational payloads are default-hidden at the model boundary', () => {
    const account = read('models/Account.js');
    const user = read('models/User.js');
    const payment = read('models/PaymentTransaction.js');
    const job = read('models/Job.js');
    const auditOutbox = read('models/PlatformAuditOutbox.js');
    const auditService = read('services/platformAuditOutboxService.js');

    assert.match(account, /passwordHash:[\s\S]*select:\s*false/);
    assert.match(user, /password:[\s\S]*select:\s*false/);
    assert.match(payment, /screenshotUrl:[\s\S]*select:\s*false/);
    assert.match(job, /payload:[\s\S]*select:\s*false/);
    assert.match(job, /lockId:[\s\S]*select:\s*false/);
    assert.match(auditOutbox, /audit:[\s\S]*select:\s*false/);
    assert.match(auditService, /findOneAndUpdate\([\s\S]*\)\.select\('\+audit'\)/);
});

test('verification serializer masks NID and omits permanent document locations', () => {
    const serialized = serializeVerificationSummary({
        _id: 'verification-1',
        status: 'pending',
        nidName: 'Vendor Owner',
        nidNumber: '1234567890123',
        nidFrontUrl: 'https://storage.example/front.jpg',
        nidBackUrl: 'https://storage.example/back.jpg',
        nidDocuments: {
            front: { url: 'https://storage.example/front.jpg', publicId: 'private/front' },
            back: { url: 'https://storage.example/back.jpg', publicId: 'private/back' }
        }
    });

    assert.deepEqual(collectForbiddenKeys(serialized), []);
    assert.notEqual(serialized.nidNumber, '1234567890123');
    assert.doesNotMatch(JSON.stringify(serialized), /storage\.example|private\/front|private\/back/);
});

test('audit rendering and outbox normalization redact sensitive nested metadata', () => {
    const rendered = serializePlatformAuditEvent({
        _id: 'audit-1',
        action: 'billing.payment_verified',
        entityType: 'PaymentTransaction',
        message: 'Payment verified',
        metadata: {
            amount: 499,
            nested: {
                accessToken: 'do-not-render',
                url: 'https://storage.example/private'
            }
        }
    });
    assert.equal(rendered.metadata.nested.accessToken, '[REDACTED]');
    assert.equal(rendered.metadata.nested.url, '[REDACTED_URL]');

    const normalized = normalizeAuditIntent({
        action: 'billing.subscription_extend',
        entityType: 'Subscription',
        message: 'Subscription extended',
        metadata: {
            previousPeriodEnd: '2026-07-01T00:00:00.000Z',
            newPeriodEnd: '2026-08-01T00:00:00.000Z',
            password: 'never-store-this',
            internalModelDump: { token: 'never-store-this' }
        }
    });
    assert.deepEqual(Object.keys(normalized.metadata).sort(), ['newPeriodEnd', 'previousPeriodEnd']);
    assert.equal(redactAuditMetadata({ password: 'secret' }).password, '[REDACTED]');
});

test('platform roles have scoped permissions instead of implicit SuperAdmin access', () => {
    assert.equal(isPlatformRole('BillingAdmin'), true);
    assert.equal(hasPlatformPermission('BillingAdmin', 'billing.payments.review'), true);
    assert.equal(hasPlatformPermission('BillingAdmin', 'compliance.documents.view'), false);
    assert.equal(hasPlatformPermission('ComplianceReviewer', 'compliance.documents.view'), true);
    assert.equal(hasPlatformPermission('ComplianceReviewer', 'billing.payments.review'), false);
    assert.equal(hasPlatformPermission('SuperAdmin', 'platform.domains.manage'), true);
});

test('reporting month boundaries use the configured platform timezone', () => {
    const previousOffset = process.env.REPORTING_TIMEZONE_OFFSET_MINUTES;
    process.env.REPORTING_TIMEZONE_OFFSET_MINUTES = '360';
    try {
        const range = getReportingMonthRange(new Date('2026-07-31T20:00:00.000Z'));
        assert.equal(range.monthStart.toISOString(), '2026-07-31T18:00:00.000Z');
        assert.equal(range.nextMonthStart.toISOString(), '2026-08-31T18:00:00.000Z');
    } finally {
        if (previousOffset === undefined) delete process.env.REPORTING_TIMEZONE_OFFSET_MINUTES;
        else process.env.REPORTING_TIMEZONE_OFFSET_MINUTES = previousOffset;
    }
});

test('generic governance and invoice edits reject protected lifecycle fields', () => {
    const superAdminController = read('controllers/superAdminController.js');
    const billingController = read('controllers/billingController.js');

    assert.match(superAdminController, /UNSUPPORTED_SHOP_GOVERNANCE_FIELDS/);
    assert.doesNotMatch(superAdminController, /\{\s*\$set:\s*req\.body\s*\}/);
    assert.match(superAdminController, /A reason is required for a forced plan change/);
    assert.match(superAdminController, /PLAN_CHANGE_CONFLICT/);
    assert.match(billingController, /INVOICE_STATUS_ACTION_REQUIRED/);
    assert.match(billingController, /runCriticalGovernanceAction/);
});

test('courier credentials are default-hidden and loaded only by dedicated courier paths', () => {
    const shopModel = read('models/Shop.js');
    const courierConfig = read('services/courierConfigService.js');
    const courierController = read('controllers/courierController.js');
    const courierWorker = read('services/courierJobService.js');
    const pathaoWorker = read('services/pathaoSyncJobService.js');

    assert.match(shopModel, /tokenEncrypted:\s*\{\s*type:\s*String,\s*default:\s*'',\s*select:\s*false\s*\}/);
    assert.match(shopModel, /client_secret:\s*\{\s*type:\s*String,\s*default:\s*null,\s*select:\s*false\s*\}/);
    assert.match(shopModel, /password:\s*\{\s*type:\s*String,\s*default:\s*null,\s*select:\s*false\s*\}/);
    assert.match(courierConfig, /COURIER_CREDENTIAL_SELECT/);
    assert.match(courierController, /\.select\(COURIER_CREDENTIAL_SELECT\)/);
    assert.match(courierWorker, /\.select\(COURIER_CREDENTIAL_SELECT\)/);
    assert.match(pathaoWorker, /\.select\(COURIER_CREDENTIAL_SELECT\)/);
});

test('platform overview uses a bounded reporting window with supporting indexes', () => {
    const controller = read('controllers/superAdminController.js');
    const orderModel = read('models/Order.js');
    const invoiceModel = read('models/Invoice.js');
    const paymentModel = read('models/PaymentTransaction.js');

    assert.match(controller, /reportFrom/);
    assert.match(controller, /\$match:\s*\{\s*createdAt:\s*\{\s*\$gte:\s*reportFrom,\s*\$lt:\s*reportTo/);
    assert.match(controller, /reportingWindow:\s*\{/);
    assert.match(orderModel, /orderSchema\.index\(\{\s*createdAt:\s*-1\s*\}\)/);
    assert.match(invoiceModel, /invoiceSchema\.index\(\{\s*status:\s*1,\s*paidAt:\s*1\s*\}\)/);
    assert.match(paymentModel, /paymentTransactionSchema\.index\(\{\s*shopId:\s*1,\s*createdAt:\s*-1\s*\}\)/);
});

test('Super Admin shop access uses effective plan entitlements instead of raw overrides', () => {
    const controller = read('controllers/superAdminController.js');
    const shopsPage = readAdmin('pages/superadmin/SuperAdminShops.jsx');
    const detailPage = readAdmin('pages/superadmin/ShopDetail.jsx');

    assert.match(controller, /getEffectiveFeatureSnapshot/);
    assert.match(controller, /effectiveFeatures/);
    assert.match(controller, /featureEntitlements/);
    assert.match(controller, /planDisplay:\s*PLAN_DEFINITIONS\.beginner\.name/);
    assert.match(controller, /populate\('planId', 'name slug features limits storeBuilderAccess storeBuilderCapabilities'\)/);
    assert.match(shopsPage, /shop\.effectiveFeatures/);
    assert.doesNotMatch(shopsPage, /shop\.featureFlags\?\.\[key\]\s*\?\s*'bg-emerald/);
    assert.match(detailPage, /entitlement\?\.planAllowed/);
});

test('Super Admin configuration workspaces are separated from Platform Overview', () => {
    const app = readAdmin('App.jsx');
    const sidebar = readAdmin('components/dashboard/Sidebar.jsx');
    const overviewPage = readAdmin('pages/superadmin/SuperAdminPanel.jsx');

    assert.match(app, /path="plans"/);
    assert.match(app, /path="announcements"/);
    assert.match(app, /path="domains"/);
    assert.match(sidebar, /label:\s*'Commerce'/);
    assert.match(sidebar, /label:\s*'Operations'/);
    assert.match(sidebar, /label:\s*'Communication'/);
    assert.match(sidebar, /label:\s*'Platform'/);
    assert.doesNotMatch(overviewPage, /API\.get\('\/super-admin\/plans'/);
    assert.doesNotMatch(overviewPage, /API\.get\('\/super-admin\/domains'/);
    assert.doesNotMatch(overviewPage, /API\.get\('\/super-admin\/announcements'/);
    assert.doesNotMatch(overviewPage, /API\.get\('\/super-admin\/failed-payments'/);
});

test('operational recovery routes require scoped permissions and recent authentication', () => {
    const routes = read('routes/superAdminRoutes.js');

    assert.match(routes, /'\/jobs\/:id\/retry'[\s\S]*workers\.jobs\.retry[\s\S]*requireRecentAuthentication[\s\S]*retryJob/);
    assert.match(routes, /'\/jobs\/:id\/cancel'[\s\S]*workers\.jobs\.cancel[\s\S]*requireRecentAuthentication[\s\S]*cancelJob/);
    assert.match(routes, /'\/jobs\/:id\/release-lock'[\s\S]*workers\.locks\.manage[\s\S]*requireRecentAuthentication[\s\S]*releaseJobLock/);
    assert.match(routes, /'\/reconciliations\/:id\/retry'[\s\S]*platform\.reconciliation\.retry[\s\S]*requireRecentAuthentication[\s\S]*retryReconciliation/);
    assert.match(routes, /'\/sessions\/:id\/revoke'[\s\S]*platform\.sessions\.manage[\s\S]*requireRecentAuthentication[\s\S]*revokePlatformSessions/);
});
