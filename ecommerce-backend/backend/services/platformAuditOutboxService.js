const crypto = require('crypto');
const mongoose = require('mongoose');
const PlatformAuditLog = require('../models/PlatformAuditLog');
const PlatformAuditOutbox = require('../models/PlatformAuditOutbox');
const { redactAuditMetadata } = require('./superAdmin/superAdminSerializers');

const MAX_ATTEMPTS = 10;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const SAFE_AUDIT_METADATA_KEYS = new Set([
    'amount',
    'billingCycle',
    'changedCapabilities',
    'changedFields',
    'changedLimits',
    'currentPeriodEnd',
    'documentType',
    'domain',
    'fromPlan',
    'hasAdminNote',
    'invoiceId',
    'newPeriodEnd',
    'newRevision',
    'newStatus',
    'planId',
    'planKey',
    'planName',
    'previousPeriodEnd',
    'previousRevision',
    'previousStatus',
    'provider',
    'recommendation',
    'score',
    'status',
    'toPlan'
]);

const allowAuditMetadata = (metadata = {}) => Object.fromEntries(
    Object.entries(metadata || {})
        .filter(([key]) => SAFE_AUDIT_METADATA_KEYS.has(key))
        .map(([key, value]) => [key, value])
);

const actorFromRequest = (req) => {
    const user = req?.user || {};
    return {
        actor_id: user.accountId || user.account_id || user._id || user.id || null,
        actorModel: user.accountId || user.account_id ? 'Account' : 'User',
        actorName: user.fullName || '',
        actorEmail: user.email || '',
        actorRole: user.role || ''
    };
};

const normalizeAuditIntent = ({ req, ...audit }) => ({
    ...actorFromRequest(req),
    action: String(audit.action || audit.eventType || '').trim(),
    entityType: String(audit.entityType || '').trim(),
    entityId: audit.entityId || null,
    entityLabel: String(audit.entityLabel || '').trim(),
    shop_id: audit.shop_id || null,
    message: String(audit.message || '').trim(),
    reason: String(audit.reason || '').trim(),
    metadata: redactAuditMetadata(allowAuditMetadata(audit.metadata || {})),
    severity: audit.severity || 'info',
    ip: req?.ip || '',
    userAgent: req?.get ? req.get('user-agent') || '' : ''
});

const createAuditIntent = async ({ audit, session = null, eventId = crypto.randomUUID() }) => {
    const normalized = normalizeAuditIntent(audit);
    if (!normalized.action || !normalized.entityType || !normalized.message) {
        throw new Error('Critical audit action, entity type, and message are required');
    }

    const [outbox] = await PlatformAuditOutbox.create([{
        eventId,
        eventType: normalized.action,
        audit: normalized
    }], { session });
    return outbox;
};

const materializeAuditIntent = async (outbox) => {
    if (!outbox) return null;
    const materializable = outbox.audit
        ? outbox
        : await PlatformAuditOutbox.findById(outbox._id).select('+audit');
    if (!materializable) throw new Error('Audit outbox intent no longer exists');
    const audit = materializable.audit || {};
    const log = await PlatformAuditLog.findOneAndUpdate(
        { outboxEventId: materializable.eventId },
        {
            $setOnInsert: {
                ...audit,
                outboxEventId: materializable.eventId,
                metadata: {
                    ...(audit.metadata || {}),
                    auditOutboxEventId: materializable.eventId
                }
            }
        },
        { new: true, upsert: true, runValidators: true }
    );

    await PlatformAuditOutbox.updateOne(
        { _id: materializable._id },
        {
            $set: {
                status: 'completed',
                completedAt: new Date(),
                lockedAt: null,
                lastError: ''
            }
        }
    );
    return log;
};

const runCriticalGovernanceAction = async ({ mutate, audit }) => {
    const session = await mongoose.startSession();
    let result;
    let outbox;
    try {
        await session.withTransaction(async () => {
            result = await mutate(session);
            const resolvedAudit = typeof audit === 'function' ? audit(result) : audit;
            outbox = await createAuditIntent({ audit: resolvedAudit, session });
        });
    } finally {
        await session.endSession();
    }

    try {
        await materializeAuditIntent(outbox);
    } catch (err) {
        console.error('[PlatformAuditOutbox] Audit materialization deferred:', err.message);
    }
    return result;
};

const claimNextAuditIntent = async () => {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
    return PlatformAuditOutbox.findOneAndUpdate(
        {
            status: { $in: ['pending', 'failed', 'processing'] },
            attempts: { $lt: MAX_ATTEMPTS },
            nextAttemptAt: { $lte: now },
            $or: [
                { status: { $ne: 'processing' } },
                { lockedAt: { $lte: staleBefore } },
                { lockedAt: null }
            ]
        },
        {
            $set: { status: 'processing', lockedAt: now },
            $inc: { attempts: 1 }
        },
        { new: true, sort: { createdAt: 1 } }
    ).select('+audit');
};

const processNextAuditIntent = async () => {
    const outbox = await claimNextAuditIntent();
    if (!outbox) return null;
    try {
        await materializeAuditIntent(outbox);
        return outbox.eventId;
    } catch (err) {
        const delayMs = Math.min(60 * 60 * 1000, 30 * 1000 * (2 ** Math.max(0, outbox.attempts - 1)));
        await PlatformAuditOutbox.updateOne(
            { _id: outbox._id },
            {
                $set: {
                    status: 'failed',
                    lockedAt: null,
                    nextAttemptAt: new Date(Date.now() + delayMs),
                    lastError: String(err.message || err).slice(0, 1000)
                }
            }
        );
        throw err;
    }
};

module.exports = {
    createAuditIntent,
    materializeAuditIntent,
    normalizeAuditIntent,
    processNextAuditIntent,
    runCriticalGovernanceAction
};
