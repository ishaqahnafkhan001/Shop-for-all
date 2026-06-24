require('dotenv').config();

const express = require('express');

const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const connectDB = require('./config/db');

const { errorHandler } = require('./middlewares/error');
const { csrfProtection } = require('./middlewares/csrf');
const { requestContext } = require('./middlewares/requestContext');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const storefrontRoutes = require('./routes/storefrontRoutes');
const publicRoutes = require('./routes/publicRoutes');
const inventoryRoutes = require('./routes/inventory');
const bannerRoutes = require('./routes/bannerRoutes');
const storeBuilderRoutes = require('./routes/storeBuilderRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const analyticsEventRoutes = require('./routes/analyticsEventRoutes');
const growthRoutes = require('./routes/growthRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const billingRoutes = require('./routes/billingRoutes');

const app = express();
app.set('trust proxy', 1);

const buildInfo = {
    version: 'mail-resend-2026-06-07-02',
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'local',
    nodeEnv: process.env.NODE_ENV || 'development'
};

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';
const tenantOriginPattern = /^https?:\/\/([a-z0-9-]+\.)?localhost:(3000|5173)$/;
const lanDevOriginPattern = /^https?:\/\/192\.168\.\d+\.\d+:(3000|5173)$/;
const scaleupOriginPattern = /^https:\/\/([a-z0-9-]+\.)?scaleup\.codes$/;

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 1000 : 5000,
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 30 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' }
});

const publicWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 60 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
});

const sanitizeMongoOperators = (value) => {
    if (!value || typeof value !== 'object') return;

    for (const key of Object.keys(value)) {
        if (key.startsWith('$') || key.includes('.')) {
            delete value[key];
            continue;
        }

        sanitizeMongoOperators(value[key]);
    }
};

const sanitizeRequest = (req, res, next) => {
    sanitizeMongoOperators(req.body);
    sanitizeMongoOperators(req.params);
    sanitizeMongoOperators(req.query);
    next();
};

app.use(requestContext);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeRequest);

app.use(
    cors({
        origin: (origin, callback) => {

            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            if (tenantOriginPattern.test(origin)) {
                return callback(null, true);
            }

            if (lanDevOriginPattern.test(origin)) {
                return callback(null, true);
            }

            if (scaleupOriginPattern.test(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked: ${origin}`));
        },

        credentials: true
    })
);
app.use(generalLimiter);

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.use(csrfProtection);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/public', publicWriteLimiter, publicRoutes);
app.use('/api/analytics', publicWriteLimiter, analyticsEventRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/store-builder', storeBuilderRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/admin/collections', collectionRoutes);
app.use('/api/admin/growth', growthRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/billing', billingRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.get('/', (req, res) => {
    res.send('API is running successfully...');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
        console.log(
            `🚀 Server running in ${
                process.env.NODE_ENV || 'development'
            } mode on port ${PORT}`
        );
        console.log(
            `[Build] version=${buildInfo.version} commit=${buildInfo.commit}`
        );
    });
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    });
}

module.exports = app;
