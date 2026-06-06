const mongoose = require('mongoose');
const User = require('../models/User');

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

const connectDB = async () => {
    try {
        // We use process.env to keep the database password secret
        const conn = await mongoose.connect(process.env.MONGO_URI);
        await ensureTenantScopedUserEmailIndex();

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);

        // Exit the process with failure code (1) if the connection fails
        // This stops the server from running if there's no database
        process.exit(1);
    }
};

module.exports = connectDB;
