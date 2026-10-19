require('dotenv').config();
const mongoose = require('mongoose');
const CustomerEmailRecipient = require('../models/CustomerEmailRecipient');
const EmailWebhookEvent = require('../models/EmailWebhookEvent');
const RegistrationWelcomeDelivery = require('../models/RegistrationWelcomeDelivery');
const Job = require('../models/Job');

const run = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is required');
    await mongoose.connect(uri);
    try {
        await CustomerEmailRecipient.createIndexes();
        await EmailWebhookEvent.createIndexes();
        await RegistrationWelcomeDelivery.createIndexes();
        await Job.createIndexes();
        console.log('Notification indexes are ready.');
    } finally {
        await mongoose.disconnect();
    }
};

run().catch(error => {
    console.error('Notification index preparation failed:', error.name || 'DATABASE_ERROR');
    process.exitCode = 1;
});
