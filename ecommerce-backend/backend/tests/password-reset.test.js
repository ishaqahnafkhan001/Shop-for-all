const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const resetService = require('../services/passwordResetService');

test('password reset OTP generation is numeric, six digit, and not stored directly', () => {
    const otp = resetService.generateResetOtp();
    const hash = resetService.hashResetValue('customer:shop:test@example.com', otp);

    assert.match(otp, /^\d{6}$/);
    assert.notEqual(hash, otp);
    assert.equal(resetService.verifyResetValue('customer:shop:test@example.com', otp, hash), true);
    assert.equal(resetService.verifyResetValue('customer:shop:test@example.com', '000000', hash), false);
});

test('password policy requires enterprise-grade complexity', () => {
    assert.equal(resetService.isStrongPassword('short'), false);
    assert.equal(resetService.isStrongPassword('lowercase1!'), false);
    assert.equal(resetService.isStrongPassword('UPPERCASE1!'), false);
    assert.equal(resetService.isStrongPassword('NoNumber!'), false);
    assert.equal(resetService.isStrongPassword('NoSpecial1'), false);
    assert.equal(resetService.isStrongPassword('StrongPass1!'), true);
});

test('password reset limits match security requirements', () => {
    assert.equal(resetService.RESET_LIMITS.expiresMs, 10 * 60 * 1000);
    assert.equal(resetService.RESET_LIMITS.resendMs, 60 * 1000);
    assert.equal(resetService.RESET_LIMITS.maxRequestsPerWindow, 5);
    assert.equal(resetService.RESET_LIMITS.maxVerificationAttempts, 5);
});

test('password reset endpoints are mounted on auth routes', () => {
    const routes = read('routes/authRoutes.js');

    assert.match(routes, /'\/forgot-password'[\s\S]*forgotPassword/);
    assert.match(routes, /'\/verify-reset-otp'[\s\S]*verifyResetOtp/);
    assert.match(routes, /'\/reset-password'[\s\S]*resetPassword/);
    assert.match(routes, /'\/update-password'[\s\S]*protect[\s\S]*updatePassword/);
});

test('forgot password response is generic and enumeration-safe', () => {
    const controller = read('controllers/authController.js');

    assert.match(controller, /GENERIC_FORGOT_RESPONSE/);
    assert.doesNotMatch(controller, /account exists[^]*404/i);
    assert.match(controller, /res\.status\(200\)\.json\(\{[\s\S]*message:\s*GENERIC_FORGOT_RESPONSE/);
});

test('password reset is tenant keyed and one-time use', () => {
    const service = read('services/passwordResetService.js');

    assert.match(service, /const getResetKey = \(\{ email, audience, shopId \}\)/);
    assert.match(service, /normalizedAudience === 'customer' && !shop/);
    assert.match(service, /record\.consumedAt/);
    assert.match(service, /record\.otpHash = undefined/);
    assert.match(service, /record\.resetTokenHash = undefined/);
    assert.match(service, /crypto\.timingSafeEqual/);
});

test('password reset emails use dedicated reset sender configuration', () => {
    const mailService = read('services/mail/mailService.js');
    const resetTransporter = read('services/mail/transporters/resetTransporter.js');
    const template = read('services/mail/templates/passwordResetTemplate.js');

    assert.match(mailService, /type === 'reset'/);
    assert.match(resetTransporter, /process\.env\.RESET_EMAIL/);
    assert.match(resetTransporter, /process\.env\.RESET/);
    assert.match(resetTransporter, /process\.env\.RESET_PASSWORD/);
    assert.match(resetTransporter, /process\.env\.PASS/);
    assert.match(template, /Reset your password/);
    assert.match(template, /verification code/);
    assert.match(template, /expires in/);
    assert.match(template, /If you did not request this reset/);
});
