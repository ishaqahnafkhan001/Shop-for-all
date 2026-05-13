require('dotenv').config();

const express = require('express');

const cookieParser = require('cookie-parser');
const cors = require('cors');

const connectDB = require('./config/db');

const { errorHandler } = require('./middlewares/error');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const storefrontRoutes = require('./routes/storefrontRoutes');
const publicRoutes = require('./routes/publicRoutes');
const inventoryRoutes = require('./routes/inventory');
const bannerRoutes = require('./routes/bannerRoutes');

const app = express();
app.set('trust proxy', 1);
connectDB();

const allowedOrigins = process.env.CORS_ORIGINS.split(',');

app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: (origin, callback) => {

            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            if (
                /^https?:\/\/([a-z0-9-]+\.)?localhost:(3000|5173)$/.test(origin)
            ) {
                return callback(null, true);
            }

            if (
                /^https?:\/\/192\.168\.\d+\.\d+:(3000|5173)$/.test(origin)
            ) {
                return callback(null, true);
            }

            if (
                // ✨ FIX: Added '\.' inside the brackets to allow 'www.'
                /^https?:\/\/([a-z0-9-\.]+)\.scaleup\.codes$/.test(origin)
            ) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked: ${origin}`));
        },

        credentials: true
    })
);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/banners', bannerRoutes);

app.get('/', (req, res) => {
    res.send('API is running successfully...');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(
        `🚀 Server running in ${
            process.env.NODE_ENV || 'development'
        } mode on port ${PORT}`
    );
});

module.exports = app;