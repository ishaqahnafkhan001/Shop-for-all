const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'registration-notification-test-secret';
process.env.PLATFORM_ROOT_DOMAIN = 'scaleup.codes';
process.env.ADMIN_APP_URL = 'https://admin.scaleup.codes';

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const {
    buildRegistrationLinks,
    buildVendorWelcomeEmail,
    buildVendorWelcomeSms,
    buildSuperAdminRegistrationEmail
} = require('../services/registrationNotificationService');

const context = {
    account: {
        fullName: 'Ishaq <script>alert(1)</script>',
        email: 'owner@example.com',
        phone: '8801712345678'
    },
    shop: {
        _id: '507f1f77bcf86cd799439011',
        shopName: 'Demo & Shop',
        subdomain: 'demo-shop'
    },
    otpChannel: 'email',
    links: {
        storefrontUrl: 'https://demo-shop.scaleup.codes',
        adminUrl: 'https://admin.scaleup.codes/dashboard',
        superAdminUrl: 'https://admin.scaleup.codes/super-admin/shops/507f1f77bcf86cd799439011'
    }
};

test('registration links use the configured platform and admin domains', () => {
    assert.deepEqual(
        buildRegistrationLinks({ subdomain: 'Demo-Shop', shopId: context.shop._id }),
        context.links
    );
});

test('vendor registration email includes storefront and admin links without credentials', () => {
    const message = buildVendorWelcomeEmail(context);

    assert.match(message.subject, /Demo & Shop/);
    assert.match(message.text, /https:\/\/demo-shop\.scaleup\.codes/);
    assert.match(message.text, /https:\/\/admin\.scaleup\.codes\/dashboard/);
    assert.match(message.html, /Ishaq &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(message.text, /password|verification code|otp/i);
});

test('SMS registration welcome contains both required links', () => {
    const message = buildVendorWelcomeSms(context);

    assert.match(message, /Demo & Shop is ready/);
    assert.match(message, /https:\/\/demo-shop\.scaleup\.codes/);
    assert.match(message, /https:\/\/admin\.scaleup\.codes\/dashboard/);
});

test('Super Admin registration email contains safe shop review details', () => {
    const message = buildSuperAdminRegistrationEmail(context);

    assert.match(message.subject, /New shop registered/);
    assert.match(message.text, /owner@example\.com/);
    assert.match(message.text, /super-admin\/shops\/507f1f77bcf86cd799439011/);
    assert.match(message.html, /Demo &amp; Shop/);
});

test('registration creates independent durable jobs before transaction commit', () => {
    const controller = read('controllers/authController.js');
    const service = read('services/registrationNotificationService.js');
    const worker = read('workers/index.js');
    const mailService = read('services/mail/mailService.js');
    const transporter = read('services/mail/transporters/confirmationTransporter.js');

    const registrationBlock = controller.slice(
        controller.indexOf('exports.registerVendor'),
        controller.indexOf('exports.registerCustomer')
    );
    const enqueueIndex = registrationBlock.indexOf('await enqueueRegistrationNotifications');
    const commitIndex = registrationBlock.indexOf('await session.commitTransaction');

    assert.ok(enqueueIndex > -1 && enqueueIndex < commitIndex);
    assert.match(service, /registration\.vendor_welcome/);
    assert.match(service, /registration\.super_admin_alert/);
    assert.match(service, /idempotencyKey: `registration\.vendor_welcome:\$\{shopId\}`/);
    assert.match(service, /idempotencyKey: `registration\.super_admin_alert:\$\{shopId\}`/);
    assert.match(service, /process\.env\.SUPER_ADMIN_EMAIL \|\| process\.env\.PLATFORM_OWNER_EMAIL/);
    assert.doesNotMatch(service, /getSuperAdminEmail/);
    assert.match(worker, /REGISTRATION_NOTIFICATION_QUEUE/);
    assert.match(mailService, /type === 'confirmation'/);
    assert.match(transporter, /process\.env\.EMAIL_USER \|\| process\.env\.ADMIN_EMAIL_USER/);
    assert.match(transporter, /process\.env\.EMAIL_PASS \|\| process\.env\.ADMIN_EMAIL_PASS/);
});
