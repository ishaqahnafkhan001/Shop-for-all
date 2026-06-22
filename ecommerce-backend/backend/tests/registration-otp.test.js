const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const {
    REGISTRATION_OTP_LIMITS,
    generateRegistrationOtp,
    hashRegistrationOtp,
    verifyRegistrationOtpHash
} = require('../services/registrationOtpService');

test('registration OTP generation is numeric, six digit, and hashed before storage', () => {
    const otp = generateRegistrationOtp();
    const hash = hashRegistrationOtp('buyer@example.com', otp);

    assert.match(otp, /^\d{6}$/);
    assert.notEqual(hash, otp);
    assert.equal(verifyRegistrationOtpHash('buyer@example.com', otp, hash), true);
    assert.equal(verifyRegistrationOtpHash('buyer@example.com', '000000', hash), false);
});

test('registration OTP model stores hash, expiry, attempts, and used marker only', () => {
    const model = read('models/OTP.js');

    assert.match(model, /otpHash/);
    assert.match(model, /attempts/);
    assert.match(model, /usedAt/);
    assert.match(model, /expiresAt[\s\S]*expires:\s*0/);
    assert.match(model, /otpSchema\.index\(\{ email:\s*1,\s*purpose:\s*1 \}/);
    assert.doesNotMatch(model, /\botp:\s*\{/);
});

test('registration OTP verification rejects expired, reused, and over-attempt records', () => {
    const service = read('services/registrationOtpService.js');

    assert.equal(REGISTRATION_OTP_LIMITS.expiresMs, 5 * 60 * 1000);
    assert.equal(REGISTRATION_OTP_LIMITS.maxAttempts, 5);
    assert.match(service, /record\.usedAt/);
    assert.match(service, /record\.expiresAt <= now/);
    assert.match(service, /record\.attempts >= REGISTRATION_OTP_LIMITS\.maxAttempts/);
    assert.match(service, /crypto\.timingSafeEqual/);
});

test('registration controller consumes hashed OTP and does not compare plaintext records', () => {
    const controller = read('controllers/authController.js');

    assert.match(controller, /createOrReplaceRegistrationOtp/);
    assert.match(controller, /consumeRegistrationOtp/);
    assert.doesNotMatch(controller, /otpRecord\.otp/);
    assert.doesNotMatch(controller, /deleteOne\(\{ email: cleanEmail \}\)/);
});
