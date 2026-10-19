const RegistrationWelcomeDelivery = require('../models/RegistrationWelcomeDelivery');

exports.getWelcomeDeliveryStatus = async (req, res) => {
    try {
        const rows = await RegistrationWelcomeDelivery.find({ shopId: req.tenantId })
            .sort({ createdAt: -1 }).limit(10)
            .select('channel status attempts providerMessageId lastError acceptedAt deliveredAt createdAt')
            .lean();
        return res.json({ success: true, data: rows });
    } catch {
        return res.status(500).json({ success: false, error: 'Could not load welcome delivery status.' });
    }
};
