require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const allowedOrigins = process.env.CORS_ORIGINS.split(',');

// Import Middlewares
const { errorHandler } = require('./middlewares/error');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const storefrontRoutes = require('./routes/storefrontRoutes');
const publicRoutes = require('./routes/publicRoutes');
const inventory = require('./routes/inventory');
const bannerRoutes = require('./routes/bannerRoutes');



// 1. Initialize Database
connectDB();

const app = express();

// 2. Global Middlewares
app.use(express.json()); // Parses incoming JSON requests
app.use(cookieParser()); // Parses cookies so we can read the JWT

// Configure CORS
// In production, replace '*' with your actual domains for security


app.use(
    cors({
        origin: (origin, callback) => {
            // allow requests with no origin (mobile apps, postman, curl)
            if (!origin) {
                return callback(null, true);
            }

            // exact matches from .env
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // allow localhost subdomains
            if (/\.localhost:3000$/.test(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },

        credentials: true,
    })
);

// 3. Mount Routes
app.use('/api/auth', authRoutes);           // Registration, Login, Logout
app.use('/api/admin', adminRoutes);         // Product & Staff management (Protected)
app.use('/api/storefront', storefrontRoutes); // Public Storefront data (Subdomain-based)
app.use('/api/public', publicRoutes);
app.use('/api/admin/inventory', inventory);
app.use('/api/banners', bannerRoutes);

// 4. Base Health Check Route
app.get('/', (req, res) => {
    res.send('API is running successfully...');
});

// 5. Global Error Handler (MUST be the last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;