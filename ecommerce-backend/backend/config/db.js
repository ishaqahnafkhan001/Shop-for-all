const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // We use process.env to keep the database password secret
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);

        // Exit the process with failure code (1) if the connection fails
        // This stops the server from running if there's no database
        process.exit(1);
    }
};

module.exports = connectDB;