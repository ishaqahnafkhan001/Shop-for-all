const mongoose = require('mongoose');
const AbuseReport = require('../models/AbuseReport');
const Invoice = require('../models/Invoice');
const Job = require('../models/Job');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const PlatformAuditOutbox = require('../models/PlatformAuditOutbox');
const Shop = require('../models/Shop');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const VendorVerification = require('../models/VendorVerification');
const WorkerLease = require('../models/WorkerLease');
const {
    FEATURE_KEYS,
    getFeatureRegistryMetadata
} = require('../config/subscriptionFeatures');
const {
    PLAN_DEFINITIONS,
    PLAN_ORDER,
    SUBSCRIPTION_STATUS_REGISTRY
} = require('../config/subscriptionPlans');
const {
    PLATFORM_PERMISSION_REGISTRY,
    PLATFORM_ROLE_PERMISSIONS,
    PLATFORM_ROLES
} = require('../config/platformPermissions');
const { runCriticalGovernanceAction } = require('../services/platformAuditOutboxService');
const {
    serializeJobSummary,
    serializeReconciliationSummary,
    serializeWorkerLeaseSummary
} = require('../services/superAdmin/superAdminSerializers');
const {
    addDateRange,
    buildPagination,
    getAllowlistedSort,
    getPagination,
    getSafeSearchRegex
} = require('../services/superAdmin/superAdminQueryService');

const JOB_SORTS = Object.freeze({
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    next_run: { runAt: 1 },
    most_attempts: { attempts: -1, createdAt: -1 }
});
const RECONCILIATION_SORTS = Object.freeze({
    newest: { updatedAt: -1 },
    oldest: { updatedAt: 1 },
    next_retry: { 'reconciliation.nextRetryAt': 1, updatedAt: 1 },
    most_attempts: { 'reconciliation.attempts': -1, updatedAt: -1 }
});
const SHOP_SORTS = Object.freeze({
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { shopName: 1 },
    name_desc: { shopName: -1 }
});
const VALID_JOB_STATUSES = new Set(['queued', 'running', 'completed', 'failed', 'dead', 'cancelled']);
const VALID_RECONCILIATION_STATUSES = new Set(['pending', 'running', 'completed', 'failed', 'cancelled']);

const getReason = (body = {}) => String(body.reason || '').trim().slice(0, 500);
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
    success: false,
    code: error.code || 'SUPER_ADMIN_OPERATION_FAILED',
    error: error.message || fallback
});

exports.getJobs = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = {};
        if (req.query.status && req.query.status !== 'all') {
            if (!VALID_JOB_STATUSES.has(req.query.status)) {
                return res.status(400).json({ success: false, error: 'Invalid job status.' });
            }
            filter.status = req.query.status;
        }
        if (req.query.queue && req.query.queue !== 'all') {
            filter.queue = String(req.query.queue).trim().slice(0, 80);
        }
        if (req.query.shopId && isObjectId(req.query.shopId)) filter.shop_id = req.query.shopId;
        const search = getSafeSearchRegex(req.query.search);
        if (search) filter.$or = [{ name: search }, { queue: search }, { lastError: search }];
        addDateRange(filter, req.query);

        const [jobs, total, queues] = await Promise.all([
            Job.find(filter)
                .select('+payload')
                .populate('shop_id', 'shopName subdomain')
                .sort(getAllowlistedSort({ query: req.query, map: JOB_SORTS }))
                .skip(skip)
                .limit(limit)
                .lean(),
            Job.countDocuments(filter),
            Job.distinct('queue')
        ]);

        res.json({
            success: true,
            data: jobs.map(serializeJobSummary),
            pagination: buildPagination({ page, limit, total }),
            registry: {
                statuses: [...VALID_JOB_STATUSES],
                queues: queues.filter(Boolean).sort()
            }
        });
    } catch (error) {
        sendError(res, error, 'Failed to load background jobs.');
    }
};

exports.retryJob = async (req, res) => {
    const reason = getReason(req.body);
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required.' });
    try {
        const expectedVersion = Number(req.body.expectedVersion);
        const job = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const filter = {
                    _id: req.params.id,
                    status: { $in: ['failed', 'dead', 'cancelled'] }
                };
                if (Number.isFinite(expectedVersion)) filter.__v = expectedVersion;
                const updated = await Job.findOneAndUpdate(
                    filter,
                    {
                        $set: {
                            status: 'queued',
                            runAt: new Date(),
                            lockedAt: null,
                            lockId: '',
                            lastError: '',
                            cancelledAt: null,
                            cancellationReason: ''
                        },
                        $inc: { __v: 1 }
                    },
                    { new: true, session }
                );
                if (!updated) {
                    const conflict = new Error('Job changed or is not retryable. Reload and try again.');
                    conflict.statusCode = 409;
                    conflict.code = 'JOB_RETRY_CONFLICT';
                    throw conflict;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'worker.job_retried',
                entityType: 'Job',
                entityId: updated._id,
                shop_id: updated.shop_id,
                message: `Background job ${updated.name} queued for retry`,
                reason,
                metadata: { status: updated.status }
            })
        });
        res.json({ success: true, data: serializeJobSummary(job) });
    } catch (error) {
        sendError(res, error, 'Failed to retry background job.');
    }
};

exports.cancelJob = async (req, res) => {
    const reason = getReason(req.body);
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required.' });
    try {
        const expectedVersion = Number(req.body.expectedVersion);
        const job = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const filter = {
                    _id: req.params.id,
                    status: { $in: ['queued', 'failed'] }
                };
                if (Number.isFinite(expectedVersion)) filter.__v = expectedVersion;
                const updated = await Job.findOneAndUpdate(
                    filter,
                    {
                        $set: {
                            status: 'cancelled',
                            cancelledAt: new Date(),
                            cancellationReason: reason,
                            lockedAt: null,
                            lockId: '',
                            lastError: ''
                        },
                        $inc: { __v: 1 }
                    },
                    { new: true, session }
                );
                if (!updated) {
                    const conflict = new Error('Job changed or cannot be cancelled safely. Reload and try again.');
                    conflict.statusCode = 409;
                    conflict.code = 'JOB_CANCEL_CONFLICT';
                    throw conflict;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'worker.job_cancelled',
                entityType: 'Job',
                entityId: updated._id,
                shop_id: updated.shop_id,
                message: `Background job ${updated.name} cancelled`,
                reason,
                severity: 'warning',
                metadata: { status: updated.status }
            })
        });
        res.json({ success: true, data: serializeJobSummary(job) });
    } catch (error) {
        sendError(res, error, 'Failed to cancel background job.');
    }
};

exports.releaseJobLock = async (req, res) => {
    const reason = getReason(req.body);
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required.' });
    try {
        const staleBefore = new Date(Date.now() - Math.max(
            60 * 1000,
            Number(process.env.JOB_STALE_LOCK_MS) || 10 * 60 * 1000
        ));
        const job = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const updated = await Job.findOneAndUpdate(
                    {
                        _id: req.params.id,
                        status: 'running',
                        lockedAt: { $lte: staleBefore }
                    },
                    {
                        $set: {
                            status: 'failed',
                            runAt: new Date(),
                            lockedAt: null,
                            lockId: '',
                            lastError: `Stale lock released by platform operator: ${reason}`
                        },
                        $inc: { __v: 1 }
                    },
                    { new: true, session }
                );
                if (!updated) {
                    const conflict = new Error('Only stale running jobs can have their lock released.');
                    conflict.statusCode = 409;
                    conflict.code = 'JOB_LOCK_NOT_STALE';
                    throw conflict;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'worker.job_lock_released',
                entityType: 'Job',
                entityId: updated._id,
                shop_id: updated.shop_id,
                message: `Stale lock released for ${updated.name}`,
                reason,
                severity: 'warning'
            })
        });
        res.json({ success: true, data: serializeJobSummary(job) });
    } catch (error) {
        sendError(res, error, 'Failed to release worker lock.');
    }
};

exports.getReconciliations = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { 'reconciliation.status': { $ne: 'idle' } };
        if (req.query.status && req.query.status !== 'all') {
            if (!VALID_RECONCILIATION_STATUSES.has(req.query.status)) {
                return res.status(400).json({ success: false, error: 'Invalid reconciliation status.' });
            }
            filter['reconciliation.status'] = req.query.status;
        }
        if (req.query.type && req.query.type !== 'all') {
            filter['reconciliation.reconciliationType'] = String(req.query.type).slice(0, 40);
        }
        if (req.query.shopId && isObjectId(req.query.shopId)) filter.shopId = req.query.shopId;
        const search = getSafeSearchRegex(req.query.search);
        if (search) {
            const shopIds = await Shop.find({
                $or: [{ shopName: search }, { subdomain: search }]
            }).select('_id').limit(100).lean();
            filter.$or = [
                { 'reconciliation.operationId': search },
                { 'reconciliation.targetPlanName': search },
                { shopId: { $in: shopIds.map(shop => shop._id) } }
            ];
        }
        addDateRange(filter, req.query, 'reconciliation.scheduledAt');

        const [items, total] = await Promise.all([
            Subscription.find(filter)
                .populate('shopId', 'shopName subdomain')
                .sort(getAllowlistedSort({ query: req.query, map: RECONCILIATION_SORTS }))
                .skip(skip)
                .limit(limit)
                .lean(),
            Subscription.countDocuments(filter)
        ]);
        res.json({
            success: true,
            data: items.map(serializeReconciliationSummary),
            pagination: buildPagination({ page, limit, total }),
            registry: { statuses: [...VALID_RECONCILIATION_STATUSES] }
        });
    } catch (error) {
        sendError(res, error, 'Failed to load reconciliations.');
    }
};

exports.retryReconciliation = async (req, res) => {
    const reason = getReason(req.body);
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required.' });
    try {
        const expectedVersion = Number(req.body.expectedVersion);
        const subscription = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const filter = {
                    _id: req.params.id,
                    'reconciliation.status': { $in: ['failed', 'cancelled'] }
                };
                if (Number.isFinite(expectedVersion)) filter.__v = expectedVersion;
                const updated = await Subscription.findOneAndUpdate(
                    filter,
                    {
                        $set: {
                            'reconciliation.status': 'pending',
                            'reconciliation.nextRetryAt': new Date(),
                            'reconciliation.lastError': '',
                            'reconciliation.cancelledAt': null,
                            'reconciliation.reason': reason
                        },
                        $inc: { __v: 1 }
                    },
                    { new: true, session }
                );
                if (!updated) {
                    const conflict = new Error('Reconciliation changed or is not retryable. Reload and try again.');
                    conflict.statusCode = 409;
                    conflict.code = 'RECONCILIATION_RETRY_CONFLICT';
                    throw conflict;
                }
                if (
                    Number(updated.reconciliation.attempts) >=
                    Number(updated.reconciliation.maxAttempts || 6)
                ) {
                    updated.reconciliation.attempts = 0;
                    await updated.save({ session });
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'billing.reconciliation_retried',
                entityType: 'Subscription',
                entityId: updated._id,
                shop_id: updated.shopId,
                message: 'Subscription reconciliation queued for retry',
                reason,
                metadata: { status: updated.reconciliation.status }
            })
        });
        res.json({ success: true, data: serializeReconciliationSummary(subscription) });
    } catch (error) {
        sendError(res, error, 'Failed to retry reconciliation.');
    }
};

exports.getLifecycleMonitor = async (req, res) => {
    try {
        const now = new Date();
        const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const [statusRows, dueTrials, duePeriods, failedReconciliations, leases] = await Promise.all([
            Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Subscription.countDocuments({ status: 'trialing', trialEndsAt: { $lte: soon } }),
            Subscription.countDocuments({
                status: { $in: ['active', 'grace'] },
                currentPeriodEnd: { $lte: soon }
            }),
            Subscription.countDocuments({ 'reconciliation.status': 'failed' }),
            WorkerLease.find().sort({ key: 1 }).lean()
        ]);
        res.json({
            success: true,
            data: {
                serverNow: now.toISOString(),
                subscriptionsByStatus: Object.fromEntries(
                    statusRows.map(row => [row._id || 'unknown', row.count])
                ),
                dueTrials,
                duePeriods,
                failedReconciliations,
                workers: leases.map(lease => serializeWorkerLeaseSummary(lease, now))
            }
        });
    } catch (error) {
        sendError(res, error, 'Failed to load lifecycle monitor.');
    }
};

exports.getShippingOperations = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = {};
        const search = getSafeSearchRegex(req.query.search);
        if (search) filter.$or = [{ shopName: search }, { subdomain: search }];
        if (req.query.provider === 'pathao') filter['couriers.pathao.enabled'] = true;
        if (req.query.provider === 'redx') filter['couriers.redx.enabled'] = true;
        addDateRange(filter, req.query);
        const [shops, total] = await Promise.all([
            Shop.find(filter)
                .select('shopName subdomain approvalStatus isActive couriers.pathao couriers.redx.tokenLast4 couriers.redx.pickupStoreId couriers.redx.pickupStoreName couriers.redx.status couriers.redx.enabled couriers.redx.lastVerifiedAt couriers.redx.configuredAt couriers.defaultCourier pathaoStoreId createdAt updatedAt')
                .sort(getAllowlistedSort({ query: req.query, map: SHOP_SORTS }))
                .skip(skip)
                .limit(limit)
                .lean(),
            Shop.countDocuments(filter)
        ]);
        res.json({
            success: true,
            data: shops.map(shop => ({
                id: shop._id,
                shopName: shop.shopName || '',
                subdomain: shop.subdomain || '',
                approvalStatus: shop.approvalStatus || '',
                isActive: shop.isActive !== false,
                defaultCourier: shop.couriers?.defaultCourier || null,
                pathao: {
                    configured: Boolean(shop.couriers?.pathao?.storeId || shop.pathaoStoreId),
                    enabled: shop.couriers?.pathao?.enabled === true,
                    status: shop.couriers?.pathao?.status || 'NotConfigured',
                    storeName: shop.couriers?.pathao?.storeName || '',
                    lastSyncedAt: shop.couriers?.pathao?.lastSyncedAt || null
                },
                redx: {
                    configured: Boolean(
                        shop.couriers?.redx?.pickupStoreId &&
                        shop.couriers?.redx?.tokenLast4
                    ),
                    enabled: shop.couriers?.redx?.enabled === true,
                    status: shop.couriers?.redx?.status || 'NotConfigured',
                    pickupStoreName: shop.couriers?.redx?.pickupStoreName || '',
                    credentialsPresent: Boolean(shop.couriers?.redx?.tokenLast4),
                    lastVerifiedAt: shop.couriers?.redx?.lastVerifiedAt || null
                },
                createdAt: shop.createdAt || null,
                updatedAt: shop.updatedAt || null
            })),
            pagination: buildPagination({ page, limit, total })
        });
    } catch (error) {
        sendError(res, error, 'Failed to load shipping operations.');
    }
};

exports.getOperationalAlerts = async (req, res) => {
    try {
        const now = new Date();
        const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const [
            failedJobs,
            deadJobs,
            failedReconciliations,
            pendingAuditEvents,
            pendingPaymentReviews,
            pendingVerifications,
            expiringTrials,
            openRiskCases
        ] = await Promise.all([
            Job.countDocuments({ status: 'failed' }),
            Job.countDocuments({ status: 'dead' }),
            Subscription.countDocuments({ 'reconciliation.status': 'failed' }),
            PlatformAuditOutbox.countDocuments({ status: { $in: ['pending', 'failed'] } }),
            PaymentTransaction.countDocuments({ status: 'pending' }),
            VendorVerification.countDocuments({ status: 'pending' }),
            Subscription.countDocuments({ status: 'trialing', trialEndsAt: { $gte: now, $lte: soon } }),
            AbuseReport.countDocuments({ status: { $in: ['Open', 'Reviewing'] } })
        ]);
        const counts = {
            failedJobs,
            deadJobs,
            failedReconciliations,
            pendingAuditEvents,
            pendingPaymentReviews,
            pendingVerifications,
            expiringTrials,
            openRiskCases
        };
        const severity = deadJobs || failedReconciliations || pendingAuditEvents
            ? 'critical'
            : (failedJobs || pendingPaymentReviews || pendingVerifications ? 'warning' : 'healthy');
        res.json({ success: true, data: { severity, counts, serverNow: now.toISOString() } });
    } catch (error) {
        sendError(res, error, 'Failed to load platform alerts.');
    }
};

exports.getPlatformRegistry = async (_req, res) => {
    res.json({
        success: true,
        data: {
            roles: PLATFORM_ROLES.map(role => ({
                role,
                permissions: PLATFORM_ROLE_PERMISSIONS[role] || []
            })),
            permissions: PLATFORM_PERMISSION_REGISTRY,
            features: getFeatureRegistryMetadata(),
            featureKeys: FEATURE_KEYS,
            plans: PLAN_ORDER.map(key => ({
                key,
                name: PLAN_DEFINITIONS[key]?.name || key
            })),
            subscriptionStatuses: SUBSCRIPTION_STATUS_REGISTRY
        }
    });
};

exports.getPlatformSessions = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { role: { $in: PLATFORM_ROLES } };
        if (req.query.role && PLATFORM_ROLES.includes(req.query.role)) filter.role = req.query.role;
        if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
        const search = getSafeSearchRegex(req.query.search);
        if (search) filter.$or = [{ fullName: search }, { email: search }];
        const [users, total] = await Promise.all([
            User.find(filter)
                .select('fullName email role status sessionVersion account_id createdAt updatedAt')
                .sort({ updatedAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);
        res.json({
            success: true,
            data: users.map(user => ({
                id: user._id,
                accountId: user.account_id || null,
                fullName: user.fullName || '',
                email: user.email || '',
                role: user.role || '',
                status: user.status || '',
                sessionVersion: Number(user.sessionVersion) || 0,
                sessionMode: 'stateless_jwt',
                createdAt: user.createdAt || null,
                updatedAt: user.updatedAt || null
            })),
            pagination: buildPagination({ page, limit, total }),
            note: 'Sessions use signed JWTs. Revocation invalidates all current tokens for the selected platform user.'
        });
    } catch (error) {
        sendError(res, error, 'Failed to load platform sessions.');
    }
};

exports.revokePlatformSessions = async (req, res) => {
    const reason = getReason(req.body);
    if (!reason) return res.status(400).json({ success: false, error: 'Reason is required.' });
    if (String(req.user?._id || '') === String(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Use logout to end your own current session.' });
    }
    try {
        const user = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const updated = await User.findOneAndUpdate(
                    { _id: req.params.id, role: { $in: PLATFORM_ROLES } },
                    { $inc: { sessionVersion: 1 } },
                    { new: true, session }
                ).select('fullName email role status sessionVersion');
                if (!updated) {
                    const notFound = new Error('Platform user not found.');
                    notFound.statusCode = 404;
                    throw notFound;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'platform.sessions_revoked',
                entityType: 'User',
                entityId: updated._id,
                entityLabel: updated.email,
                message: `All sessions revoked for ${updated.fullName || updated.email}`,
                reason,
                severity: 'warning'
            })
        });
        res.json({
            success: true,
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                sessionVersion: user.sessionVersion
            }
        });
    } catch (error) {
        sendError(res, error, 'Failed to revoke platform sessions.');
    }
};

exports.getPlatformReports = async (req, res) => {
    try {
        const now = new Date();
        const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
        const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const [
            shopsCreated,
            orders,
            orderRevenue,
            approvedPayments,
            invoices,
            subscriptionsByPlan,
            subscriptionsByStatus
        ] = await Promise.all([
            Shop.countDocuments({ createdAt: { $gte: from, $lt: now } }),
            Order.countDocuments({ createdAt: { $gte: from, $lt: now } }),
            Order.aggregate([
                { $match: { createdAt: { $gte: from, $lt: now } } },
                { $group: { _id: null, amount: { $sum: '$pricing.total' } } }
            ]),
            PaymentTransaction.aggregate([
                { $match: { status: { $in: ['approved', 'verified'] }, verifiedAt: { $gte: from, $lt: now } } },
                { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            Invoice.aggregate([
                { $match: { createdAt: { $gte: from, $lt: now } } },
                { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
            ]),
            Subscription.aggregate([{ $group: { _id: '$activePlanSlug', count: { $sum: 1 } } }]),
            Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        ]);
        res.json({
            success: true,
            data: {
                reportingWindow: { from, to: now, days },
                shopsCreated,
                orders,
                orderRevenue: Number(orderRevenue[0]?.amount) || 0,
                approvedPayments: {
                    count: Number(approvedPayments[0]?.count) || 0,
                    amount: Number(approvedPayments[0]?.amount) || 0
                },
                invoices: Object.fromEntries(invoices.map(row => [row._id || 'unknown', {
                    count: row.count,
                    amount: row.amount
                }])),
                subscriptionsByPlan: Object.fromEntries(
                    subscriptionsByPlan.map(row => [row._id || 'unknown', row.count])
                ),
                subscriptionsByStatus: Object.fromEntries(
                    subscriptionsByStatus.map(row => [row._id || 'unknown', row.count])
                )
            }
        });
    } catch (error) {
        sendError(res, error, 'Failed to load platform reports.');
    }
};

exports.getPlatformSettings = async (_req, res) => {
    const configured = name => Boolean(String(process.env[name] || '').trim());
    res.json({
        success: true,
        data: {
            environment: process.env.NODE_ENV || 'development',
            security: {
                csrfConfigured: configured('CSRF_SECRET'),
                orderAccessConfigured: configured('ORDER_ACCESS_TOKEN_SECRET'),
                storefrontProxyConfigured: configured('STOREFRONT_PROXY_SECRET'),
                recentAuthenticationMinutes: Math.round(
                    (Number(process.env.PLATFORM_RECENT_AUTH_MAX_AGE_MS) || 15 * 60 * 1000) / 60000
                )
            },
            providers: {
                smtpConfigured: configured('ADMIN_EMAIL_USER') && configured('ADMIN_EMAIL_PASS'),
                cloudinaryConfigured: configured('CLOUDINARY_CLOUD_NAME') &&
                    configured('CLOUDINARY_API_KEY') &&
                    configured('CLOUDINARY_API_SECRET'),
                geminiConfigured: configured('GEMINI_API_KEY'),
                smsConfigured: configured('SMS_API_KEY') || configured('SMS_PROVIDER_TOKEN')
            },
            valuesExposed: false
        }
    });
};
