const DataRequest = require('../models/DataRequest');
const { logAudit } = require('../services/auditLogService');

const cleanText = (value = '', max = 1000) => String(value || '').trim().slice(0, max);

const getRequestContext = (req) => ({
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || ''
});

exports.createCustomerDataRequest = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ success: false, error: 'Shop context is required' });
        }

        const type = cleanText(req.body?.type, 20);
        if (!DataRequest.REQUEST_TYPES.includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid request type' });
        }

        const request = await DataRequest.create({
            shop_id: req.tenantId,
            customer_id: req.user?._id || null,
            type,
            email: cleanText(req.body?.email || req.user?.email, 160).toLowerCase(),
            phone: cleanText(req.body?.phone || req.user?.phone, 40),
            note: cleanText(req.body?.note, 1000),
            ...getRequestContext(req)
        });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: `privacy.data_request.${type}.created`,
            entityType: 'DataRequest',
            entityId: request._id,
            severity: 'info',
            metadata: { type }
        });

        res.status(201).json({
            success: true,
            message: 'Privacy request submitted',
            data: request
        });
    } catch (err) {
        console.error('Create customer data request error:', err);
        res.status(500).json({ success: false, error: 'Failed to submit privacy request' });
    }
};

exports.getAdminDataRequests = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ success: false, error: 'Shop context is required' });
        }

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;
        const query = { shop_id: req.tenantId };

        if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
        if (req.query.type && req.query.type !== 'all') query.type = req.query.type;

        const [data, total] = await Promise.all([
            DataRequest.find(query)
                .populate('customer_id', 'fullName email phone')
                .populate('handledBy', 'fullName email')
                .sort({ requestedAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            DataRequest.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit) || 1
            }
        });
    } catch (err) {
        console.error('Get admin data requests error:', err);
        res.status(500).json({ success: false, error: 'Failed to load privacy requests' });
    }
};

exports.updateAdminDataRequest = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ success: false, error: 'Shop context is required' });
        }

        const status = cleanText(req.body?.status, 40);
        if (!DataRequest.REQUEST_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid request status' });
        }

        const update = {
            status,
            note: cleanText(req.body?.note, 1000),
            handledBy: req.user?._id || null
        };
        if (['completed', 'rejected'].includes(status)) update.completedAt = new Date();

        const request = await DataRequest.findOneAndUpdate(
            { _id: req.params.id, shop_id: req.tenantId },
            { $set: update },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({ success: false, error: 'Privacy request not found' });
        }

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: `privacy.data_request.${request.type}.${status}`,
            entityType: 'DataRequest',
            entityId: request._id,
            severity: status === 'rejected' ? 'warning' : 'info',
            metadata: { status, type: request.type }
        });

        res.status(200).json({
            success: true,
            message: 'Privacy request updated',
            data: request
        });
    } catch (err) {
        console.error('Update admin data request error:', err);
        res.status(500).json({ success: false, error: 'Failed to update privacy request' });
    }
};
