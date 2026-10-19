require('dotenv').config();

const production = process.env.NODE_ENV === 'production';
const issues = [];
const warnings = [];
const provider = String(process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
if (!['resend', 'smtp'].includes(provider)) issues.push('EMAIL_PROVIDER must be resend or smtp');
const required = (key) => { if (!process.env[key]) issues.push(`${key} is missing`); };

if (provider === 'resend') {
    required('RESEND_API_KEY');
    const welcomeSender = process.env.EMAIL_USER || process.env.RESEND_FROM || process.env.ADMIN_EMAIL_USER;
    if (!welcomeSender) issues.push('Welcome email sender address is missing');
    else if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(welcomeSender)) {
        issues.push('Welcome email sender address is invalid');
    }
    if (!process.env.RESEND_WEBHOOK_SECRET) {
        (production ? issues : warnings).push('RESEND_WEBHOOK_SECRET is missing; signed webhook tracking is unavailable');
    } else if (!process.env.RESEND_WEBHOOK_SECRET.startsWith('whsec_') ||
        Buffer.from(process.env.RESEND_WEBHOOK_SECRET.slice(6), 'base64').length < 16) {
        issues.push('RESEND_WEBHOOK_SECRET must be the Resend webhook signing secret');
    }
} else {
    required('ADMIN_EMAIL_USER');
    required('ADMIN_EMAIL_PASS');
    warnings.push('SMTP has no provider idempotency; interrupted submissions require manual reconciliation');
}

required('PUBLIC_API_URL');
if (production) {
    required('ADMIN_APP_URL');
    required('PLATFORM_ROOT_DOMAIN');
    required('SUPPORT_EMAIL');
}
if (process.env.SUPPORT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL)) {
    issues.push('SUPPORT_EMAIL must be a valid mailbox');
}
try {
    const admin = new URL(process.env.ADMIN_APP_URL || (production ? '' : 'http://localhost:5173'));
    if (production && admin.protocol !== 'https:') issues.push('ADMIN_APP_URL must use HTTPS in production');
    if (production && (admin.hostname === 'localhost' || admin.hostname.endsWith('.localhost'))) issues.push('ADMIN_APP_URL must be publicly reachable in production');
    if (admin.username || admin.password || admin.pathname !== '/' || admin.search || admin.hash) issues.push('ADMIN_APP_URL must be an origin without credentials or a path');
} catch { issues.push('ADMIN_APP_URL is invalid'); }
if (production && !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(process.env.PLATFORM_ROOT_DOMAIN || '')) {
    issues.push('PLATFORM_ROOT_DOMAIN must be a public hostname without a scheme, path, or port');
}
if (production) required('MARKETING_UNSUBSCRIBE_SECRET');
const secret = process.env.MARKETING_UNSUBSCRIBE_SECRET || (!production ? process.env.JWT_SECRET : '');
if (secret && secret.length < 32) issues.push('MARKETING_UNSUBSCRIBE_SECRET must have at least 32 characters');
try {
    const url = new URL(process.env.PUBLIC_API_URL || 'http://localhost');
    if (production && url.protocol !== 'https:') issues.push('PUBLIC_API_URL must use HTTPS in production');
    if (url.username || url.password) issues.push('PUBLIC_API_URL must not contain credentials');
} catch { issues.push('PUBLIC_API_URL is invalid'); }

const smsMockMode = String(process.env.SMS_MOCK_MODE || '').toLowerCase() === 'true';
if (production && smsMockMode) issues.push('SMS_MOCK_MODE must be false in production');
if (!smsMockMode) {
    required('SMS_API_BASE_URL');
    required('SMS_API_KEY');
}
if (production && process.env.SMS_API_BASE_URL && !process.env.SMS_API_BASE_URL.startsWith('https://')) {
    issues.push('SMS_API_BASE_URL must use HTTPS in production');
}
warnings.push('Confirm a separate `npm run worker` process is running; this check cannot inspect deployment processes');

for (const issue of issues) console.error(`ERROR: ${issue}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
console.log(`Notification configuration: ${issues.length ? 'incomplete' : 'ready'} (${provider}, ${production ? 'production' : 'non-production'})`);
process.exitCode = issues.length ? 1 : 0;
