const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

const getSecret = () => {
    const secret = process.env.COURIER_SECRET || process.env.JWT_SECRET || process.env.CSRF_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('Courier secret is not configured');
    }
    return secret || 'development-courier-secret';
};

const getKey = () => crypto.createHash('sha256').update(getSecret()).digest();

const encryptSecret = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return '';

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
};

const decryptSecret = (value = '') => {
    const text = String(value || '');
    if (!text) return '';

    const parts = text.split(':');
    if (parts.length !== 3) return text;

    const [ivValue, tagValue, encryptedValue] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, 'base64')),
        decipher.final()
    ]);
    return decrypted.toString('utf8');
};

const maskSecret = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return '';
    const visible = text.slice(-4);
    return `${'•'.repeat(12)}${visible}`;
};

module.exports = {
    decryptSecret,
    encryptSecret,
    maskSecret
};
