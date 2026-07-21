const SubscriptionAuditLog = require('../../models/SubscriptionAuditLog');
const mongoose = require('mongoose');
const { buildPagination } = require('../../utils/pagination');

const sanitizeFilterText = (value, max = 120) => String(value || '').trim().slice(0, max);
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const recordSubscriptionAuditEvent = async (event) => {
    if (!event?.shopId) return null;
    return SubscriptionAuditLog.create({
        eventId: event.eventId,
        tenantId: event.tenantId || event.shopId,
        shopId: event.shopId,
        subscriptionId: event.subscriptionId || null,
        eventType: event.type,
        action: `subscription.${String(event.type).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()}`,
        actor: event.actor || {},
        oldValue: event.oldValue ?? null,
        newValue: event.newValue ?? null,
        reason: event.reason || '',
        ip: event.request?.ip || '',
        userAgent: event.request?.userAgent || '',
        requestId: event.request?.requestId || '',
        correlationId: event.correlationId,
        affectedResources: event.affectedResources || [],
        metadata: event.metadata || {},
        occurredAt: event.occurredAt
    });
};

const listSubscriptionAuditTimeline = async ({ query = {}, shopId = null, vendorSafe = false } = {}) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (query.shopId && !shopId && mongoose.Types.ObjectId.isValid(String(query.shopId))) filter.shopId = query.shopId;
    if (query.eventType) filter.eventType = sanitizeFilterText(query.eventType, 100);
    if (query.actorRole) filter['actor.role'] = sanitizeFilterText(query.actorRole, 80);
    if (query.correlationId) filter.correlationId = sanitizeFilterText(query.correlationId);
    if (query.search) {
        const regex = new RegExp(escapeRegex(sanitizeFilterText(query.search, 80)), 'i');
        filter.$or = [
            { eventType: regex },
            { action: regex },
            { reason: regex },
            { correlationId: regex }
        ];
    }
    if (query.dateFrom || query.dateTo) {
        filter.occurredAt = {};
        if (query.dateFrom) filter.occurredAt.$gte = new Date(query.dateFrom);
        if (query.dateTo) filter.occurredAt.$lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
        SubscriptionAuditLog.find(filter).sort({ occurredAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        SubscriptionAuditLog.countDocuments(filter)
    ]);
    const safeData = vendorSafe ? data.map(item => ({
        _id: item._id,
        eventType: item.eventType,
        action: item.action,
        actor: { name: item.actor?.name || '', role: item.actor?.role || 'System' },
        oldValue: item.oldValue,
        newValue: item.newValue,
        reason: item.reason,
        correlationId: item.correlationId,
        affectedResources: item.affectedResources,
        metadata: item.metadata,
        occurredAt: item.occurredAt,
        createdAt: item.createdAt
    })) : data;
    return { data: safeData, pagination: buildPagination({ total, page, limit }) };
};

module.exports = {
    recordSubscriptionAuditEvent,
    listSubscriptionAuditTimeline
};
