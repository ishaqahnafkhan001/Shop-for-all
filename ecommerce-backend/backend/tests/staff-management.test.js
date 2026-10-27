const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('actual Admin creation payload validates and every permission has a strict update contract', async () => {
    const { DEFAULT_STAFF_PERMISSIONS } = await import('../../../ecommerce-admin/src/utils/staffPermissions.js');
    const { STAFF_PERMISSION_KEYS } = require('../config/staffPermissions');
    const { createStaffSchema, updateStaffSchema } = require('../validations/userValidation');
    assert.deepEqual(Object.keys(DEFAULT_STAFF_PERMISSIONS).sort(), [...STAFF_PERMISSION_KEYS].sort());
    const payload = { fullName: 'Synthetic Staff', email: 'staff@example.com', password: 'Synthetic123!', phone: '', staffTitle: '', role: 'VendorStaff', permissions: DEFAULT_STAFF_PERMISSIONS };
    assert.equal(createStaffSchema.validate(payload).error, undefined);
    for (const key of STAFF_PERMISSION_KEYS) {
        assert.equal(updateStaffSchema.validate({ permissions: { [key]: false } }).error, undefined);
        for (const value of ['false', 'true', 0, 1, null, [], {}]) assert.ok(updateStaffSchema.validate({ permissions: { [key]: value } }).error);
    }
    assert.ok(updateStaffSchema.validate({ permissions: { staff: true } }).error);
    assert.ok(updateStaffSchema.validate({ role: 'VendorAdmin' }).error);
    assert.ok(updateStaffSchema.validate({ status: 'Wrong' }).error);
    assert.ok(createStaffSchema.validate({ ...payload, password: 'short' }).error);
});

test('partial permission sanitizer preserves unrelated access and rejects coercion', () => {
    const { sanitizeStaffPermissions } = require('../services/staff/staffCapacityService');
    const result = sanitizeStaffPermissions({ orders: false }, { products: true, orders: true });
    assert.equal(result.orders, false);
    assert.equal(result.products, true);
    for (const value of [null, [], { orders: 'false' }, { unexpected: true }]) assert.throws(() => sanitizeStaffPermissions(value));
});

test('staff management routes expose summary, create, edit, and soft remove behind vendor admin access', () => {
    const routes = read('routes/adminRoutes.js');

    assert.match(routes, /'\/staff\/summary'[\s\S]*authorize\('VendorAdmin'\)[\s\S]*getStaffSummary/);
    assert.match(routes, /'\/users'[\s\S]*requireShopFeature\('staffAccounts'\)[\s\S]*requireStaffLimit[\s\S]*createShopUser/);
    assert.match(routes, /'\/users\/:id'[\s\S]*requireShopFeature\('staffAccounts'\)[\s\S]*updateShopUser/);
    assert.match(routes, /router\.delete\([\s\S]*'\/users\/:id'[\s\S]*removeShopStaff/);
});

test('staff capacity counts only active VendorStaff and supports remaining slots', () => {
    const service = read('services/staff/staffCapacityService.js');

    assert.match(service, /role:\s*'VendorStaff'/);
    assert.match(service, /status:\s*'Active'/);
    assert.match(service, /remainingStaffSlots/);
    assert.match(service, /canAddStaff/);
    assert.match(service, /featureEnabled/);
    assert.match(service, /normalizeStaffLimit/);
});

test('staff controller keeps email read-only, tenant scoped, and deactivates instead of deleting', () => {
    const controller = read('controllers/userController.js');

    assert.match(controller, /role:\s*'VendorStaff'/);
    assert.match(controller, /shop_id:\s*req\.user\.shopId/);
    assert.doesNotMatch(controller, /user\.email\s*=/);
    assert.match(controller, /Only staff accounts can be created/);
    assert.match(controller, /STAFF_LIMIT_REACHED/);
    assert.match(controller, /staff\.removed/);
    assert.match(controller, /user\.status\s*=\s*'Suspended'/);
    assert.doesNotMatch(controller, /findOneAndDelete\([\s\S]*VendorStaff/);
});
