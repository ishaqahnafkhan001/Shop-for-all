require('dotenv').config();

const express = require('express');

const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');

const { errorHandler } = require('./middlewares/error');

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
const superAdminRoutes = require('./routes/superAdminRoutes');

const app = express();
app.set('trust proxy', 1);
connectDB();

const buildInfo = {
    version: 'mail-resend-2026-06-07-02',
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'local',
    nodeEnv: process.env.NODE_ENV || 'development'
};

const getMailDiagnostics = () => {
    const emailProvider = String(process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

    return {
        provider: emailProvider,
        resendEnabled: emailProvider === 'resend',
        hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
        resendFrom: process.env.RESEND_FROM || null,
        adminEmailUser: process.env.ADMIN_EMAIL_USER || null,
        orderMail: process.env.ORDER_MAIL || null,
        smtpFallbackConfigured: Boolean(
            (process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER) &&
            (process.env.ADMIN_EMAIL_PASS || process.env.EMAIL_PASS)
        )
    };
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
        build: buildInfo,
        mail: getMailDiagnostics()
    });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/public', publicWriteLimiter, publicRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/store-builder', storeBuilderRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/admin/collections', collectionRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.get('/', (req, res) => {
    res.send('API is running successfully...');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    const mailDiagnostics = getMailDiagnostics();
    console.log(
        `🚀 Server running in ${
            process.env.NODE_ENV || 'development'
        } mode on port ${PORT}`
    );
    console.log(
        `[Build] version=${buildInfo.version} commit=${buildInfo.commit}`
    );
    console.log(
        `[Mail] provider=${mailDiagnostics.provider} resendEnabled=${mailDiagnostics.resendEnabled} hasResendApiKey=${mailDiagnostics.hasResendApiKey} from=${mailDiagnostics.resendFrom || mailDiagnostics.adminEmailUser || 'not-configured'}`
    );
});

module.exports = app;
