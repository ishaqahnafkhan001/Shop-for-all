const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    hashOpaqueToken,
    createOpaqueToken,
    buildDiagnostics,
    derivePriority
} = require('../services/support/supportUtils');
const {
    SUPPORT_ROLES,
    ACTIVE_CAPACITY_STATUSES
} = require('../services/support/supportConstants');
const {
    hasSupportPermission
} = require('../middlewares/supportAuth');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('support roles are platform roles without unrestricted SuperAdmin access', () => {
    assert.deepEqual(SUPPORT_ROLES, ['SupportAgent', 'SupportLead', 'TechnicalSupport']);
    assert.equal(hasSupportPermission('SupportAgent', 'support.tickets.readAssigned'), true);
    assert.equal(hasSupportPermission('SupportAgent', 'support.staff.manage'), false);
    assert.equal(hasSupportPermission('SupportLead', 'support.tickets.assign'), true);
    assert.equal(hasSupportPermission('TechnicalSupport', 'support.tickets.internalNote'), true);
    assert.equal(hasSupportPermission('SuperAdmin', 'support.staff.manage'), true);
});

test('support account roles are accepted by auth but remain separate from shop memberships', () => {
    const userModel = read('models/User.js');
    const accountModel = read('models/Account.js');
    const authMiddleware = read('middlewares/auth.js');
    const authController = read('controllers/authController.js');

    assert.match(userModel, /SupportAgent/);
    assert.match(userModel, /TechnicalSupport/);
    assert.match(userModel, /return !\['SuperAdmin', 'SupportAgent', 'SupportLead', 'TechnicalSupport'\]\.includes\(this\.role\)/);
    assert.match(accountModel, /SupportLead/);
    assert.match(authMiddleware, /PLATFORM_ROLES/);
    assert.match(authMiddleware, /account\.platformRole !== legacyUser\.role/);
    assert.match(authController, /PLATFORM_ROLES\.includes\(account\.platformRole\)/);
});

test('vendor and platform support routes are mounted with backend authorization', () => {
    const app = read('app.js');
    const vendorRoutes = read('routes/adminSupportRoutes.js');
    const platformRoutes = read('routes/supportRoutes.js');

    assert.match(app, /\/api\/admin\/support/);
    assert.match(app, /\/api\/support/);
    assert.match(vendorRoutes, /authorize\('VendorAdmin', 'VendorStaff'\)/);
    assert.match(vendorRoutes, /supportWriteLimiter/);
    assert.match(platformRoutes, /requirePlatformSupportRole/);
    assert.match(platformRoutes, /requireSupportPermission\('support\.tickets\.assign'\)/);
    assert.match(platformRoutes, /requireSupportPermission\('support\.staff\.manage'\)/);
});

test('support tickets store conversations separately and hide internal notes from vendor APIs', () => {
    const ticketModel = read('models/SupportTicket.js');
    const messageModel = read('models/SupportMessage.js');
    const controller = read('controllers/supportController.js');

    assert.match(ticketModel, /ticketNumber/);
    assert.match(messageModel, /ticketId/);
    assert.match(messageModel, /isInternalNote/);
    assert.match(controller, /isInternalNote:\s*false/);
    assert.match(controller, /internal_note/);
    assert.match(controller, /support\.internal_note_created/);
});

test('invitation tokens are opaque, hashed, one-time, and email queued', () => {
    const token = createOpaqueToken();
    const hash = hashOpaqueToken(token);
    const controller = read('controllers/supportController.js');

    assert.notEqual(token, hash);
    assert.equal(hash.length, 64);
    assert.match(controller, /tokenHash:\s*hashOpaqueToken\(token\)/);
    assert.match(controller, /consumedAt/);
    assert.match(controller, /support\.invitation_email/);
    assert.doesNotMatch(controller, /passwordHash:\s*password/);
});

test('assignment service uses active capacity statuses and deterministic skills', () => {
    const service = read('services/support/supportAssignmentService.js');

    assert.deepEqual(ACTIVE_CAPACITY_STATUSES, ['assigned', 'in_progress', 'waiting_for_vendor', 'waiting_for_engineering', 'reopened']);
    assert.match(service, /exactSkill/);
    assert.match(service, /workloadRatio/);
    assert.match(service, /lastAssignedAt/);
    assert.match(service, /String\(a\.user\._id\)\.localeCompare/);
    assert.match(service, /status:\s*'unassigned'/);
});

test('safe diagnostics and priority rules avoid raw browser storage or vendor critical abuse', () => {
    const diagnostics = buildDiagnostics({
        route: '/dashboard/products',
        browser: '<script>x</script>Chrome',
        token: 'secret',
        cookies: 'secret'
    });

    assert.equal(diagnostics.route, '/dashboard/products');
    assert.equal(Object.hasOwn(diagnostics, 'token'), false);
    assert.equal(Object.hasOwn(diagnostics, 'cookies'), false);
    assert.equal(diagnostics.browser.includes('<script>'), false);
    assert.equal(derivePriority({ requestedPriority: 'critical', category: 'products', impact: {} }), 'high');
    assert.equal(derivePriority({ requestedPriority: 'normal', category: 'security', impact: {} }), 'critical');
});

test('worker processes support email queue without creating a duplicate queue system', () => {
    const worker = read('workers/index.js');
    const notifications = read('services/support/supportNotificationService.js');

    assert.match(worker, /support:\s*processSupportJob/);
    assert.match(notifications, /queue:\s*'support'/);
    assert.match(notifications, /idempotencyKey/);
    assert.match(notifications, /support\.vendor_email/);
    assert.match(notifications, /support\.staff_email/);
});
