'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLaunchSafetyContext } = require('../helpers/launchSafetyHarness');
const User = require('../../models/User');
const Account = require('../../models/Account');
const Membership = require('../../models/ShopMembership');
const StaffPermission = require('../../models/StaffPermission');
const { DEFAULT_STAFF_PERMISSIONS } = require('../../config/staffPermissions');
const payload = () => ({ fullName: 'Synthetic Staff', email: 'new-staff@example.com', password: 'Synthetic123!', role: 'VendorStaff', permissions: { ...DEFAULT_STAFF_PERMISSIONS, overview: true } });

test('staff creation, partial permissions, tenant isolation and safe staff listing through real routes', async t => {
    const ctx = await createLaunchSafetyContext(t), client = ctx.vendorAClient();
    const created = await client.unsafePost('/api/admin/users', payload());
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.user.id;
    const changed = await client.unsafePatch(`/api/admin/users/${id}/permissions`, { permissions: { orders: false } });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.body.user.permissions.products, true);
    assert.equal(changed.body.user.permissions.orders, false);
    const invalid = await client.unsafePatch(`/api/admin/users/${id}/permissions`, { permissions: { orders: 'false' } });
    assert.equal(invalid.status, 400);
    const foreign = await ctx.vendorBClient().unsafePatch(`/api/admin/users/${id}`, { fullName: 'Changed name' });
    assert.equal(foreign.status, 404);
    const listing = await client.get('/api/admin/users');
    assert.equal(listing.status, 200);
    assert.ok(listing.body.every(user => user.role === 'VendorStaff' && !('password' in user) && !('account_id' in user)));
    const user = await User.findById(id).lean();
    assert.equal((await StaffPermission.findOne({ legacyUser_id: id }).lean()).permissions.orders, user.permissions.orders);
});

test('concurrent permission patches never silently lose unrelated changes', async t => {
    const ctx = await createLaunchSafetyContext(t), client = ctx.vendorAClient();
    const id = ctx.data.identities.staffA.user._id;
    const patches = [{ permissions: { products: false } }, { permissions: { orders: false } }];
    const responses = await Promise.all(patches.map(patch => client.unsafePatch(`/api/admin/users/${id}/permissions`, patch)));
    for (let index = 0; index < responses.length; index++) {
        assert.ok([200, 409].includes(responses[index].status), JSON.stringify(responses[index].body));
        if (responses[index].status === 409) assert.equal((await client.unsafePatch(`/api/admin/users/${id}/permissions`, patches[index])).status, 200);
    }
    const user = await User.findById(id).lean();
    assert.equal(user.permissions.products, false);
    assert.equal(user.permissions.orders, false);
    assert.deepEqual((await StaffPermission.findOne({ legacyUser_id: id }).lean()).permissions, user.permissions);
});

test('failed staff creation rolls back account, user, membership and permission records', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const count = async () => Promise.all([Account.countDocuments(), User.countDocuments(), Membership.countDocuments(), StaffPermission.countDocuments()]);
    const before = await count();
    t.mock.method(StaffPermission, 'create', async () => { throw new Error('Synthetic permission-write failure'); });
    const result = await ctx.vendorAClient().unsafePost('/api/admin/users', payload());
    assert.equal(result.status, 500);
    assert.deepEqual(await count(), before);
});

test('permission-write failure rolls back User and deactivation invalidates old sessions after reactivation', async t => {
    const ctx = await createLaunchSafetyContext(t), client = ctx.vendorAClient();
    const id = ctx.data.identities.staffA.user._id;
    const oldClient = ctx.staffAClient();
    const before = await User.findById(id).lean();
    const mocked = t.mock.method(StaffPermission, 'findOneAndUpdate', async () => { throw new Error('Synthetic permission-write failure'); });
    assert.equal((await client.unsafePatch(`/api/admin/users/${id}`, { permissions: { products: false } })).status, 500);
    assert.deepEqual((await User.findById(id).lean()).permissions, before.permissions);
    mocked.mock.restore();
    assert.equal((await client.unsafeDelete(`/api/admin/users/${id}`)).status, 200);
    assert.equal((await Membership.findById(before.membership_id).lean()).status, 'Suspended');
    assert.equal((await User.findById(id).lean()).sessionVersion, (before.sessionVersion || 0) + 1);
    assert.equal((await client.unsafePatch(`/api/admin/users/${id}`, { status: 'Active' })).status, 200);
    assert.equal((await oldClient.get('/api/admin/products')).status, 401);
});
