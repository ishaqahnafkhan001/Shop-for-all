// Text cells are quoted and formula-prefixed values neutralized. Numeric negatives remain numbers.
const cell = value => typeof value === 'number' && Number.isFinite(value) ? String(value)
    : `"${String(value ?? '').replace(/^[\s]*[=+@-]/, match => `'${match}`).replace(/"/g, '""')}"`;
const salesReportCsv = report => {
    const meta = report.meta;
    const metadata = [new Date(meta.from).toISOString(), new Date(meta.to).toISOString(), meta.timezone, meta.currency, meta.metricVersion, new Date(meta.generatedAt).toISOString(), meta.warnings.join(' | ')];
    const columns = ['section', 'date', 'product_id', 'title', 'delivered_orders', 'delivered_units', 'gross_product_sales', 'coupon_discounts', 'product_refunds', 'net_product_sales', 'buying_cost_net_of_restock', 'product_gross_profit', 'delivery_charges', 'tax', 'delivery_refunds', 'tax_refunds', 'from_inclusive', 'to_exclusive', 'timezone', 'currency', 'metric_version', 'generated_at', 'warnings'];
    const row = (section, data, extra = ['', '', '']) => [section, ...extra, data.orders, data.units ?? data.quantity, data.gross, data.discount, data.refunds, data.revenue, data.costKnown ? data.cost : null, data.profit, data.shipping, data.tax, data.shippingRefunds, data.taxRefunds, ...metadata];
    const rows = [columns, row('summary', report.summary), ...report.salesByDay.map(data => row('day', data, [data.date, '', ''])), ...report.products.map(data => row('product', data, ['', data._id, data.title]))];
    return '\uFEFF' + rows.map(values => values.map(cell).join(',')).join('\r\n') + '\r\n';
};
module.exports = { salesReportCsv };
