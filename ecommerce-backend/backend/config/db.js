const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.set('bufferCommands', false);

const ensureTenantScopedUserEmailIndex = async () => {
    const collection = User.collection;
    const indexes = await collection.indexes();
    const globalEmailIndex = indexes.find(index => index.name === 'email_1' && index.unique);

    if (globalEmailIndex) {
        await collection.dropIndex('email_1');
        console.log('Dropped legacy global users.email unique index.');
    }

    await collection.createIndex(
        { shop_id: 1, email: 1 },
        {
            unique: true,
            partialFilterExpression: { shop_id: { $exists: true } }
        }
    );
};

const getMaskedMongoHost = (uri = '') => {
    if (!uri) return 'not configured';

    try {
        const withoutCredentials = uri.replace(/\/\/([^/@]+)@/, '//***:***@');
        const match = withoutCredentials.match(/\/\/([^/?]+)/);
        return match ? match[1] : 'configured';
    } catch (_) {
        return 'configured';
    }
};

const buildConnectionHelp = (error, mongoUri) => {
    const message = error?.message || '';
    const code = error?.code || '';
    const isSrvUri = /^mongodb\+srv:\/\//i.test(mongoUri || '');
    const lines = [
        '',
        'MongoDB connection failed.',
        `Reason: ${message || 'Unknown connection error'}`,
        `Target: ${getMaskedMongoHost(mongoUri)}`,
        ''
    ];

    if (!mongoUri) {
        lines.push(
            'MONGO_URI is missing from your environment.',
            'Add MONGO_URI to ecommerce-backend/backend/.env and restart the backend.'
        );
        return lines.join('\n');
    }

    if (isSrvUri && (code === 'ETIMEOUT' || /queryTxt|ETIMEOUT|ENOTFOUND|ESERVFAIL/i.test(message))) {
        lines.push(
            'This looks like a DNS problem with the Atlas SRV connection string.',
            'Your URI probably starts with mongodb+srv://, which requires DNS TXT lookup.',
            'On this network the TXT lookup is timing out, so Mongoose cannot connect.',
            '',
            'Recommended fix:',
            '1. Open MongoDB Atlas.',
            '2. Go to Connect -> Drivers.',
            '3. Copy the standard non-SRV connection string if Atlas offers it, or change your DNS/network.',
            '4. Update MONGO_URI and restart the backend.',
            '',
            'Alternative checks:',
            '- Try a different internet connection/hotspot/VPN.',
            '- Make sure MongoDB Atlas Network Access allows your current IP.',
            '- Confirm the cluster is running and the database password is correct.'
        );
        return lines.join('\n');
    }

    if (/authentication failed|bad auth/i.test(message)) {
        lines.push(
            'This looks like a database username/password problem.',
            'Check the MongoDB database user password in MONGO_URI.',
            'If the password contains special characters, URL-encode it.'
        );
        return lines.join('\n');
    }

    if (/IP|whitelist|ENETUNREACH|ECONNREFUSED|timed out/i.test(message)) {
        lines.push(
            'This may be a network or Atlas IP access-list problem.',
            'Check MongoDB Atlas Network Access and add your current public IP.',
            'Also confirm your network allows outbound connections to MongoDB Atlas.'
        );
        return lines.join('\n');
    }

    lines.push(
        'Check MONGO_URI, Atlas cluster status, database user credentials, and network access.'
    );
    return lines.join('\n');
};

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    try {
        if (!mongoUri) {
            throw new Error('MONGO_URI is not configured');
        }

        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        });
        await ensureTenantScopedUserEmailIndex();

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(buildConnectionHelp(error, mongoUri));
        throw error;
    }
};

module.exports = connectDB;
