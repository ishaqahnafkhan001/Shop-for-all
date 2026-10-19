const express = require('express');
const { escapeHtml } = require('../services/mail/templates/escapeHtml');
const { parseUnsubscribeToken, unsubscribeCustomer, parseConfirmToken, confirmMarketingConsent } = require('../services/marketing/marketingPreferenceService');

const router = express.Router();
router.use(express.urlencoded({ extended: false, limit: '4kb' }));

router.get('/unsubscribe', (req, res) => {
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cache-Control', 'no-store');
    const token = String(req.query.token || '');
    if (!parseUnsubscribeToken(token)) return res.status(400).send('Invalid unsubscribe link.');
    return res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font:16px system-ui;max-width:30rem;margin:4rem auto;padding:1rem"><h1>Unsubscribe from marketing emails?</h1><p>Order updates and security messages will still reach you.</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button style="padding:.8rem 1.2rem;cursor:pointer">Unsubscribe</button></form></body></html>`);
});

router.post('/unsubscribe', async (req, res, next) => {
    try {
        res.set('Referrer-Policy', 'no-referrer');
        res.set('Cache-Control', 'no-store');
        const ok = await unsubscribeCustomer(req.body?.token);
        if (!ok) return res.status(400).send('Invalid unsubscribe link.');
        return res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribed</title><body style="font:16px system-ui;max-width:30rem;margin:4rem auto;padding:1rem"><h1>You are unsubscribed</h1><p>You will no longer receive marketing emails from this store. Order and security messages are unaffected.</p></body></html>');
    } catch (error) { return next(error); }
});

router.get('/confirm', (req, res) => {
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cache-Control', 'no-store');
    const token = String(req.query.token || '');
    if (!parseConfirmToken(token)) return res.status(400).send('Invalid or expired confirmation link.');
    return res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm email subscription</title><body style="font:16px system-ui;max-width:30rem;margin:4rem auto;padding:1rem"><h1>Confirm email subscription</h1><p>Receive store offers and product updates. You can unsubscribe at any time.</p><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button style="padding:.8rem 1.2rem;cursor:pointer">Confirm subscription</button></form></body></html>`);
});

router.post('/confirm', async (req, res, next) => {
    try {
        res.set('Referrer-Policy', 'no-referrer');
        res.set('Cache-Control', 'no-store');
        const ok = await confirmMarketingConsent({ token: req.body?.token, ip: req.ip, userAgent: req.headers['user-agent'] });
        if (!ok) return res.status(400).send('Invalid or expired confirmation link.');
        return res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Subscription confirmed</title><body style="font:16px system-ui;max-width:30rem;margin:4rem auto;padding:1rem"><h1>Subscription confirmed</h1><p>You can unsubscribe from any marketing email.</p></body></html>');
    } catch (error) { return next(error); }
});

module.exports = router;
