const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    DEFAULT_PLAN_DEFINITIONS,
    mergePlan,
    normalizePlanName
} = require('../services/billing/billingPlanService');
const { isBillingSuspension, TRIAL_DAYS, GRACE_DAYS } = require('../services/billing/subscriptionService');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('billing default plans match Starter Growth Pro business rules', () => {
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Starter.monthlyPrice, 999);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Starter.yearlyPrice, 9990);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Starter.productLimit, 100);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Starter.staffLimit, 1);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Starter.features.customDomain, false);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Starter.features.growthCenter, false);

    assert.equal(DEFAULT_PLAN_DEFINITIONS.Growth.monthlyPrice, 2499);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Growth.productLimit, 500);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Growth.features.growthCenter, true);

    assert.equal(DEFAULT_PLAN_DEFINITIONS.Pro.monthlyPrice, 5999);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Pro.productLimit, 2000);
    assert.equal(DEFAULT_PLAN_DEFINITIONS.Pro.prioritySupport, true);
});

test('billing plan helper preserves stored plan overrides and safe fallbacks', () => {
    assert.equal(normalizePlanName('Growth'), 'Growth');
    assert.equal(normalizePlanName('Unknown'), 'Starter');

    const merged = mergePlan({
        name: 'Growth',
        monthlyPrice: 1999,
        features: { aiAdGenerator: false }
    }, 'Growth');

    assert.equal(merged.monthlyPrice, 1999);
    assert.equal(merged.yearlyPrice, 24990);
    assert.equal(merged.features.growthCenter, true);
    assert.equal(merged.features.aiAdGenerator, false);
});

test('billing models include required statuses and tenant indexes', () => {
    const subscription = read('models/Subscription.js');
    const invoice = read('models/Invoice.js');
    const payment = read('models/PaymentTransaction.js');

    assert.match(subscription, /shopId:[\s\S]*unique:\s*true/);
    assert.match(subscription, /trialing/);
    assert.match(subscription, /pending_approval/);
    assert.match(subscription, /grace/);
    assert.match(subscription, /suspended/);
    assert.match(subscription, /pendingPlanId/);
    assert.match(subscription, /pendingPlanName/);

    assert.match(invoice, /invoiceNumber:[\s\S]*unique:\s*true/);
    assert.match(invoice, /submitted/);
    assert.match(invoice, /paid/);
    assert.match(invoice, /rejected/);

    assert.match(payment, /manual_bkash/);
    assert.match(payment, /manual_nagad/);
    assert.match(payment, /manual_bank/);
    assert.match(payment, /approved/);
    assert.match(payment, /invoiceId:\s*1,\s*status:\s*1/);
});

test('billing routes are protected and mounted under vendor and super admin APIs', () => {
    const app = read('app.js');
    const vendorRoutes = read('routes/billingRoutes.js');
    const superRoutes = read('routes/superAdminRoutes.js');
    const superBillingRoutes = read('routes/superAdminBillingRoutes.js');

    assert.match(app, /app\.use\('\/api\/admin\/billing',\s*billingRoutes\)/);
    assert.match(superRoutes, /router\.use\('\/billing',\s*superAdminBillingRoutes\)/);
    assert.match(vendorRoutes, /router\.use\(protect\)/);
    assert.match(vendorRoutes, /authorize\('VendorAdmin',\s*'VendorStaff'\)/);
    assert.match(vendorRoutes, /router\.post\('\/invoices',\s*createVendorInvoice\)/);
    assert.match(superRoutes, /router\.use\(authorize\('SuperAdmin'\)\)/);
    assert.match(superBillingRoutes, /\/payments\/:id\/verify/);
    assert.match(superBillingRoutes, /\/payments\/:id\/reject/);
    assert.match(superRoutes, /router\.get\('\/notifications'/);
    assert.match(superRoutes, /router\.patch\('\/notifications\/read-all'/);
    assert.match(superRoutes, /router\.patch\('\/notifications\/:id\/read'/);
});

test('new vendor registration creates a trial subscription in the existing transaction', () => {
    const authController = read('controllers/authController.js');

    assert.match(authController, /createTrialForShop/);
    assert.match(authController, /await createTrialForShop\(newShop,\s*\{\s*session\s*\}\)/);
    assert.match(authController, /isBillingSuspension\(memberShop\)/);
    assert.match(authController, /isVerificationSuspension\(memberShop\)/);
    const subscriptionService = read('services/billing/subscriptionService.js');
    assert.match(subscriptionService, /'plan\.name':\s*'Trial'/);
    assert.match(subscriptionService, /'plan\.status':\s*'Trialing'/);
    assert.equal(TRIAL_DAYS, 14);
    assert.equal(GRACE_DAYS, 3);
});

test('manual payment verification and rejection create platform audit entries', () => {
    const service = read('services/billing/paymentVerificationService.js');
    const controller = read('controllers/billingController.js');

    assert.match(service, /billing\.payment_submitted/);
    assert.match(service, /billing\.payment_verified/);
    assert.match(service, /billing\.payment_rejected/);
    assert.match(service, /markPendingApproval/);
    assert.match(service, /subscription\.pending_approval/);
    assert.match(service, /createPlatformNotification/);
    assert.match(service, /sendSuperAdminPaymentSubmittedEmailSafe/);
    assert.match(service, /payment\.status = 'approved'/);
    assert.match(service, /returnToTrialOrPastDueAfterRejection/);
    assert.match(service, /Rejection reason is required/);
    assert.match(service, /createNotification/);
    assert.match(controller, /pendingApprovalSubscriptions/);
    assert.match(controller, /getPlanDisplayForSubscription/);
    assert.match(controller, /exports\.createVendorInvoice/);
    assert.match(controller, /Billing invoice created/);
});

test('billing suspension is recognized without matching verification suspension', () => {
    assert.equal(isBillingSuspension({ suspensionReason: 'Billing trial expired' }), true);
    assert.equal(isBillingSuspension({ suspensionReason: 'Payment verification required' }), true);
    assert.equal(isBillingSuspension({ suspensionReason: 'Manual policy violation' }), false);
});

test('billing gates enforce product and staff limits before create actions', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const billingGate = read('middlewares/billingGate.js');

    assert.match(adminRoutes, /requireProductLimit\(\)/);
    assert.match(adminRoutes, /requireStaffLimit/);
    assert.match(adminRoutes, /requireProductLimit\(\(req\) => Array\.isArray\(req\.body\?\.products\)/);
    assert.match(billingGate, /PRODUCT_LIMIT_REACHED/);
    assert.match(billingGate, /STAFF_LIMIT_REACHED/);
    assert.match(billingGate, /BILLING_REQUIRED/);
});
