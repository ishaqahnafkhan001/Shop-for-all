const { salesReportCsv } = require('../services/orders/reportExportService');
const User = require('../models/User');
const { getComparedSalesReport } = require('../services/orders/salesReportService');
const { reportInterval } = require('../services/orders/reportingMetrics');
const { getLowStockRows } = require('../services/orders/orderAnalyticsService');

exports.getAdvancedAnalytics = async (req, res) => {
    try {
        const interval = reportInterval(req.query);
        const [report, lowStockProducts, totalCustomers] = await Promise.all([
            getComparedSalesReport({ tenantId: req.tenantId, ...interval }),
            getLowStockRows(req.tenantId),
            User.countDocuments({ shop_id: req.tenantId, role: 'Customer' })
        ]);
        if (req.query.format === 'csv') return res.status(200).type('text/csv').attachment('sales-report.csv').send(salesReportCsv(report));
        return res.status(200).json({ success: true, data: {
            ...report,
            summary: { ...report.summary, totalCustomers, abandonedCarts: null, conversionRate: null },
            bestSellingProducts: [...report.products].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
            lowStockProducts,
            measurement: { conversionRate: 'unavailable', abandonedCarts: 'not_configured', trafficSource: 'order_channel' }
        } });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to load analytics' });
    }
};
