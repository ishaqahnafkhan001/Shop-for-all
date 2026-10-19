const axios = require('axios');

const RESEND_API_URL = 'https://api.resend.com/emails';

const isResendEnabled = () =>
    String(process.env.EMAIL_PROVIDER || '').toLowerCase() === 'resend';

const sendResendMail = async ({ from, to, subject, html, text, replyTo, idempotencyKey, tags }) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    }

    const payload = {
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        ...(html && { html }),
        ...(text && { text }),
        ...(replyTo && { reply_to: replyTo }),
        ...(tags?.length && { tags })
    };

    const response = await axios.post(RESEND_API_URL, payload, {
        timeout: 15000,
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
        }
    });

    return response.data;
};

const retrieveResendMail = async (id) => {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required');
    const response = await axios.get(`${RESEND_API_URL}/${encodeURIComponent(id)}`, {
        timeout: 10000,
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
    });
    return response.data;
};

module.exports = {
    isResendEnabled,
    sendResendMail,
    retrieveResendMail
};
