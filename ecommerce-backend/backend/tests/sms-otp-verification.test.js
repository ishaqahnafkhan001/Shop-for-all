const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    isValidBDPhone,
    maskPhone,
    normalizeBDPhone,
    toLocalBDPhone
} = require('../utils/phoneUtils');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Bangladesh phone utility normalizes accepted mobile formats', () => {
    assert.equal(normalizeBDPhone('01712345678'), '8801712345678');
    assert.equal(normalizeBDPhone('+8801712345678'), '8801712345678');
    assert.equal(normalizeBDPhone('8801712345678'), '8801712345678');
    assert.equal(toLocalBDPhone('8801712345678'), '01712345678');
    assert.equal(maskPhone('8801712345678'), '017****5678');
    assert.equal(isValidBDPhone('01912345678'), true);
});

test('Bangladesh phone utility rejects malformed or non-BD numbers', () => {
    assert.equal(normalizeBDPhone('12345'), '');
    assert.equal(normalizeBDPhone('01112345678'), '');
    assert.equal(normalizeBDPhone('+9101712345678'), '');
    assert.equal(normalizeBDPhone('01712abc678'), '');
    assert.equal(normalizeBDPhone(''), '');
});

test('SMS provider uses bearer auth and does not put API token in request body', () => {
    const source = read('services/sms/smsProviderService.js');
    assert.match(source, /Authorization:\s*`Bearer \$\{config\.apiKey\}`/);
    assert.match(source, /providerMobile = config\.phoneFormat === 'normalized'[\s\S]*toLocalBDPhone\(normalizedMobile\)/);
    assert.match(source, /mobile:\s*providerMobile/);
    assert.match(source, /sid:\s*config\.senderId/);
    assert.doesNotMatch(source, /api_token/);
});

test('vendor registration supports email and sms OTP verification states', () => {
    const authController = read('controllers/authController.js');
    const shopValidation = read('validations/shopValidation.js');

    assert.match(shopValidation, /otpChannel:\s*Joi\.string\(\)\.valid\('email', 'sms'\)/);
    assert.match(shopValidation, /phone:\s*Joi\.string\(\)/);
    assert.match(authController, /PURPOSES\.vendorRegistrationPhone/);
    assert.match(authController, /phoneVerified:\s*otpChannel === 'sms'/);
    assert.match(authController, /emailVerified:\s*otpChannel === 'email'/);
});

test('checkout phone OTP routes are mounted and final order paths consume proof before stock decrement', () => {
    const storefrontRoutes = read('routes/storefrontRoutes.js');
    const orderController = read('controllers/orderController.js');
    const publicController = read('controllers/publicController.js');

    assert.match(storefrontRoutes, /'\/:subdomain\/checkout\/send-otp'/);
    assert.match(storefrontRoutes, /'\/:subdomain\/checkout\/verify-otp'/);
    assert.match(orderController, /consumeCheckoutPhoneProof\(\{[\s\S]*phone:\s*shipping\.address\.phone[\s\S]*verificationToken:\s*phoneVerificationToken/);
    assert.match(publicController, /consumeCheckoutPhoneProof\(\{[\s\S]*phone:\s*normalizedCustomerPhone[\s\S]*verificationToken:\s*phoneVerificationToken/);

    const loggedInBlock = orderController.slice(orderController.indexOf('exports.createOrder'), orderController.indexOf('exports.cancelOrder'));
    const loggedInConsumeIndex = loggedInBlock.indexOf('await consumeCheckoutPhoneProof');
    const loggedInStockIndex = loggedInBlock.indexOf('decrementVariantStockAtomically');
    assert.ok(loggedInConsumeIndex > -1 && loggedInConsumeIndex < loggedInStockIndex);

    const publicBlock = publicController.slice(publicController.indexOf('exports.createPublicOrder'), publicController.indexOf('exports.getPublicShopDetails'));
    const publicConsumeIndex = publicBlock.indexOf('await consumeCheckoutPhoneProof');
    const publicStockIndex = publicBlock.indexOf('decrementVariantStockAtomically');
    assert.ok(publicConsumeIndex > -1 && publicConsumeIndex < publicStockIndex);
});

test('vendor verified badge is computed from NID approval plus phone verification', () => {
    const statusService = read('services/verification/vendorVerificationStatusService.js');
    const storeController = read('controllers/storeController.js');
    const vendorService = read('services/vendorVerificationService.js');

    assert.match(statusService, /nidStatus === 'approved' && phoneVerified && activeApproved/);
    assert.match(storeController, /shop\.shopVerification = buildPublicShopVerification\(shop\)/);
    assert.match(vendorService, /const phoneVerified = Boolean\(shop\.verification\?\.phoneVerified\)/);
    assert.match(vendorService, /if \(isVerificationSuspension\(shop\)\) \{[\s\S]*if \(phoneVerified\)/);
});
