const {
    listScheduledSales,
    listSaleCollections,
    createScheduledSale,
    updateScheduledSale,
    cancelScheduledSale
} = require('../services/sales/scheduledSaleService');
const { logAudit } = require('../services/auditLogService');

exports.listScheduledSales = async (req, res) => {
    try {
        const { sales, pagination } = await listScheduledSales({
            shopId: req.tenantId,
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status
        });
        res.status(200).json({ success: true, data: sales, pagination });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load scheduled sales' });
    }
};

exports.listSaleCollections = async (req, res) => {
    try {
        const collections = await listSaleCollections({
            shopId: req.tenantId,
            search: req.query.search,
            limit: req.query.limit
        });
        res.status(200).json({ success: true, data: collections });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load sale collections' });
    }
};

exports.createScheduledSale = async (req, res) => {
    try {
        const sale = await createScheduledSale({
            shopId: req.tenantId,
            userId: req.user?._id,
            payload: req.body
        });
        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'scheduled_sale.created',
            entityType: 'ScheduledSale',
            entityId: sale._id,
            entityLabel: sale.name,
            after: { status: sale.status, startsAt: sale.startsAt, endsAt: sale.endsAt }
        });
        res.status(201).json({ success: true, data: sale, message: 'Scheduled sale created' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to create scheduled sale' });
    }
};

exports.updateScheduledSale = async (req, res) => {
    try {
        const sale = await updateScheduledSale({
            shopId: req.tenantId,
            saleId: req.params.id,
            userId: req.user?._id,
            payload: req.body
        });
        if (!sale) return res.status(404).json({ success: false, error: 'Scheduled sale not found' });
        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'scheduled_sale.updated',
            entityType: 'ScheduledSale',
            entityId: sale._id,
            entityLabel: sale.name,
            after: { status: sale.status, startsAt: sale.startsAt, endsAt: sale.endsAt }
        });
        res.status(200).json({ success: true, data: sale, message: 'Scheduled sale updated' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to update scheduled sale' });
    }
};

exports.cancelScheduledSale = async (req, res) => {
    try {
        const sale = await cancelScheduledSale({
            shopId: req.tenantId,
            saleId: req.params.id,
            userId: req.user?._id
        });
        if (!sale) return res.status(404).json({ success: false, error: 'Scheduled sale not found' });
        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'scheduled_sale.cancelled',
            entityType: 'ScheduledSale',
            entityId: sale._id,
            entityLabel: sale.name,
            severity: 'warning',
            after: { status: sale.status }
        });
        res.status(200).json({ success: true, data: sale, message: 'Scheduled sale cancelled' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to cancel scheduled sale' });
    }
};
