const express = require('express');
const router = express.Router();

const { trackAnalyticsEvent } = require('../controllers/analyticsEventController');

router.post('/event', trackAnalyticsEvent);

module.exports = router;
