const Invoice = require('../../models/Invoice');
const Subscription = require('../../models/Subscription');
const { calculatePlanPrice } = require('./billingPlanService');

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
    billingCycle = 'monthly',
    amount,
    dueDate,
    notes = '',
    session
}) => {
    const subscription = await Subscription.findById(subscriptionId).session(session || null);
    if (!subscription) throw new Error('Subscription not found');

    const finalAmount = amount ?? await calculatePlanPrice(planId || 'Starter', billingCycle);
    const [invoice] = await Invoice.create([{
        shopId,
        subscriptionId,
        planId,
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
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid') throw new Error('Invoice is already paid');
    invoice.status = 'submitted';
    if (options.notes) invoice.notes = options.notes;
    await invoice.save();
    return invoice;
};

const markInvoicePaid = async (invoiceId, options = {}) => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    invoice.status = 'paid';
    invoice.paidAt = options.paidAt || new Date();
    if (options.notes) invoice.notes = options.notes;
    await invoice.save();
    return invoice;
};

const rejectInvoice = async (invoiceId, options = {}) => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    invoice.status = 'rejected';
    if (options.notes) invoice.notes = options.notes;
    await invoice.save();
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
