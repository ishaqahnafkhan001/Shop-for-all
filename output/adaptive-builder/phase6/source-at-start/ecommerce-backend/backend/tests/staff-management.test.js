const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

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
