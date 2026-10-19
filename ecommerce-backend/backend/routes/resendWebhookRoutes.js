const express = require('express');
const { verifyResendWebhook, processResendEvent } = require('../services/mail/resendWebhookService');

const router = express.Router();
router.post('/', async (req, res) => {
    const eventId = req.get('svix-id');
    if (!verifyResendWebhook({
        body: req.rawBody, id: eventId,
        timestamp: req.get('svix-timestamp'), signature: req.get('svix-signature')
    })) return res.status(401).json({ success: false });
    try {
        const result = await processResendEvent({ eventId, event: req.body });
        return res.status(200).json({ success: true, ...result });
    } catch {
        return res.status(503).json({ success: false });
    }
});
module.exports = router;
