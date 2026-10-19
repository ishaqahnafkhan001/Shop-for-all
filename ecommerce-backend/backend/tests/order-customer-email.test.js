const assert = require('node:assert/strict');
const test = require('node:test');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const User = require('../models/User');
const { baseTemplate } = require('../services/mail/templates/baseTemplate');
const {
    ORDER_RECEIPT_QUEUE, ORDER_RECEIPT_JOB, formatOrderDetails,
    enqueueOrderReceipt, processOrderReceiptJob, notifyCustomerOrderStatus
} = require('../services/orders/orderEmailService');

const shopId = '507f1f77bcf86cd799439011';
const customerId = '507f1f77bcf86cd799439012';
const order = {
    _id: '507f1f77bcf86cd799439013', shop_id: shopId, customer: {
        _id: customerId, fullName: 'Ishaq', email: 'buyer@example.test'
    },
    items: [{ title: '<Blue Shirt>', quantity: 2, price: 450, buyingPrice: 100,
        total: 900, attributes: [{ name: 'Size', value: 'M' }] }],
    pricing: { subtotal: 900, discount: 100, shipping: 80, total: 880 },
    payment: { method: 'COD' },
    shipping: { zone: 'Inside Dhaka', address: { addressLine: 'Road 1', city: 'Dhaka' } }
};

test('placement and confirmation emails show order snapshots, never internal buying price', async () => {
    const original = Shop.findById;
    Shop.findById = () => ({ select: () => ({ lean: async () => ({ shopName: 'ADI' }) }) });
    const sent = [];
    try {
        for (const status of ['Placed', 'Confirmed']) {
            await notifyCustomerOrderStatus({ shopId, order, status,
                send: async message => { sent.push(message); return { id: 'mocked-provider-id' }; } });
        }
    } finally { Shop.findById = original; }
    assert.equal(sent.length, 2);
    for (const message of sent) {
        assert.equal(message.to, 'buyer@example.test');
        assert.match(message.content, /2 × <Blue Shirt> \(Size: M\)/);
        assert.match(message.content, /Subtotal: ৳900\.00/);
        assert.match(message.content, /Discount: −৳100\.00/);
        assert.match(message.content, /Delivery: ৳80\.00/);
        assert.match(message.content, /Total: ৳880\.00/);
        assert.match(message.content, /Delivery address: Road 1, Dhaka, Inside Dhaka/);
        assert.doesNotMatch(message.content, /buyingPrice|৳100\.00\s*\(cost\)/);
        assert.equal(message.text, message.content);
        assert.equal(message.showGreeting, false);
        assert.match(baseTemplate(message), /&lt;Blue Shirt&gt;/);
        assert.doesNotMatch(baseTemplate(message), /<Blue Shirt>/);
        assert.doesNotMatch(baseTemplate(message), /Hello Ishaq,/);
    }
    assert.match(sent[0].subject, /We received your order/);
    assert.match(sent[1].subject, /confirmed/);
    assert.match(formatOrderDetails(order), /Payment: COD/);
});

test('receipt is a separate durable job in the checkout transaction', async () => {
    const session = { marker: 'checkout-transaction' };
    let scheduled;
    await enqueueOrderReceipt({ shopId, order, customer: order.customer, session },
        async input => { scheduled = input; return { _id: 'job' }; });
    assert.equal(scheduled.queue, ORDER_RECEIPT_QUEUE);
    assert.equal(scheduled.name, ORDER_RECEIPT_JOB);
    assert.equal(scheduled.session, session);
    assert.equal(scheduled.shop_id, shopId);
    assert.equal(String(scheduled.payload.orderId), order._id);
    assert.equal(scheduled.idempotencyKey, `order.placed_receipt:${order._id}`);
    assert.equal(scheduled.maxAttempts, 3);
    assert.equal(await enqueueOrderReceipt({ shopId, order, customer: {} }, async () => {
        throw new Error('should not enqueue without an address');
    }), null);
});

test('receipt processor fetches the order and customer within the job tenant', async () => {
    const originals = { orderFind: Order.findOne, userFind: User.findOne };
    const queries = {};
    Order.findOne = query => { queries.order = query; return { lean: async () => ({ ...order, customer: customerId }) }; };
    User.findOne = query => { queries.customer = query; return { select: () => ({ lean: async () => order.customer }) }; };
    let sent;
    try {
        await processOrderReceiptJob({ name: ORDER_RECEIPT_JOB, shop_id: shopId,
            payload: { orderId: order._id, customerId } }, async input => { sent = input; });
    } finally { Order.findOne = originals.orderFind; User.findOne = originals.userFind; }
    assert.equal(queries.order.shop_id, shopId);
    assert.equal(queries.order.customer, customerId);
    assert.equal(queries.customer.shop_id, shopId);
    assert.equal(queries.customer.role, 'Customer');
    assert.equal(sent.status, 'Placed');
    assert.equal(sent.idempotencyKey, `order/placed/${shopId}/${order._id}`);
});

test('both checkout paths enqueue the receipt before commit and worker handles it separately', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (const file of ['controllers/orderController.js', 'controllers/publicController.js']) {
        const source = read(file);
        assert.ok(source.indexOf('await enqueueOrderReceipt(') < source.indexOf('await session.commitTransaction();',
            source.indexOf('await enqueueOrderReceipt(')));
    }
    const worker = read('workers/index.js');
    assert.match(worker, /\[ORDER_RECEIPT_QUEUE\]: processOrderReceiptJob/);
});
