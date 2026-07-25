const Invoice = require('../../models/Invoice');
const Subscription = require('../../models/Subscription');
const { calculatePlanPrice, getPlanSlug, normalizePlanName } = require('./billingPlanService');

const pad = (value) => String(value).padStart(2, '0');

const generateInvoiceNumber = () => {
    const now = new Date();
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `INV-${date}-${suffix}`;
};

const createInvoice = async ({
    shopId,
    subscriptionId,
    planId = null,
    planName = '',
    planSlug = '',
    upgradeIntentId = null,
    billingCycle = 'monthly',
    amount,
    dueDate,
    notes = '',
    session
}) => {
    const subscription = await Subscription.findById(subscriptionId).session(session || null);
    if (!subscription) throw new Error('Subscription not found');

    const finalAmount = amount ?? await calculatePlanPrice(planId || 'Starter', billingCycle);
    const finalPlanName = planName || normalizePlanName(planSlug || 'Starter');
    const finalPlanSlug = planSlug || getPlanSlug(finalPlanName);
    const [invoice] = await Invoice.create([{
        shopId,
        subscriptionId,
        planId,
        planName: finalPlanName,
        planSlug: finalPlanSlug,
        upgradeIntentId,
        invoiceNumber: generateInvoiceNumber(),
        amount: Number(finalAmount || 0),
        billingCycle,
        status: 'unpaid',
        dueDate: dueDate || new Date(),
        notes
    }], { session });

    subscription.lastInvoiceId = invoice._id;
    await subscription.save({ session });

    return invoice;
};

const markInvoiceSubmitted = async (invoiceId, options = {}) => {
    const invoice = await Invoice.findById(invoiceId).session(options.session || null);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') throw new Error('Invoice is already paid');
    invoice.status = 'submitted';
    if (options.notes) invoice.notes = options.notes;
    await invoice.save({ session: options.session });
    return invoice;
};

const markInvoicePaid = async (invoiceId, options = {}) => {
    const invoice = await Invoice.findById(invoiceId).session(options.session || null);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') return invoice;
    if (invoice.status !== 'submitted') {
        const error = new Error(`Invoice cannot be paid while it is ${invoice.status}.`);
        error.code = 'INVOICE_INVALID_STATE';
        error.statusCode = 409;
        throw error;
    }
    invoice.status = 'paid';
    invoice.paidAt = options.paidAt || new Date();
    if (options.notes) invoice.notes = options.notes;
    await invoice.save({ session: options.session });
    return invoice;
};

const rejectInvoice = async (invoiceId, options = {}) => {
    const invoice = await Invoice.findById(invoiceId).session(options.session || null);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'rejected') return invoice;
    if (invoice.status !== 'submitted') {
        const error = new Error(`Invoice cannot be rejected while it is ${invoice.status}.`);
        error.code = 'INVOICE_INVALID_STATE';
        error.statusCode = 409;
        throw error;
    }
    invoice.status = 'rejected';
    if (options.notes) invoice.notes = options.notes;
    await invoice.save({ session: options.session });
    return invoice;
};

const expireInvoice = async (invoiceId) => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    invoice.status = 'expired';
    await invoice.save();
    return invoice;
};

module.exports = {
    generateInvoiceNumber,
    createInvoice,
    markInvoiceSubmitted,
    markInvoicePaid,
    rejectInvoice,
    expireInvoice
};
