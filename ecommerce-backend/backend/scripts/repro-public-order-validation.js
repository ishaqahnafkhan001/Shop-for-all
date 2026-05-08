// const mongoose = require('mongoose');
// const Order = require('../models/Order');
//
// const fakeObjectId = () => new mongoose.Types.ObjectId();
//
// const shopId = fakeObjectId();
// const customerId = fakeObjectId();
// const productId = fakeObjectId();
// const variantId = fakeObjectId();
//
// const legacyPayloadAsSavedBeforeFix = {
//     shop_id: shopId,
//     customer: customerId,
//     items: [
//         {
//             productId,
//             variantId: undefined,
//             title: 'Demo Product',
//             quantity: 2,
//             price: undefined,
//             buyingPrice: 100,
//             total: Number.NaN,
//         }
//     ],
//     pricing: {
//         subtotal: Number.NaN,
//         shipping: 60,
//         total: Number.NaN,
//     },
//     shipping: {
//         zone: 'Inside Dhaka',
//         cost: 60,
//         address: 'Road 1, Dhaka',
//     },
//     payment: { method: 'COD' },
//     status: 'Pending',
// };
//
// const normalizedPayloadAfterFix = {
//     shop_id: shopId,
//     customer: customerId,
//     items: [
//         {
//             productId,
//             variantId,
//             title: 'Demo Product',
//             quantity: 2,
//             price: 200,
//             buyingPrice: 100,
//             total: 400,
//         }
//     ],
//     pricing: {
//         subtotal: 400,
//         shipping: 60,
//         total: 460,
//     },
//     shipping: {
//         zone: 'Inside Dhaka',
//         cost: 60,
//         address: {
//             fullName: 'Guest Customer',
//             phone: '+8801000000000',
//             addressLine: 'Road 1',
//             city: 'Dhaka',
//         },
//     },
//     payment: { method: 'COD' },
//     status: 'Pending',
// };
//
// const legacyError = new Order(legacyPayloadAsSavedBeforeFix).validateSync();
// const normalizedError = new Order(normalizedPayloadAfterFix).validateSync();
//
// if (!legacyError) {
//     throw new Error('Expected legacy payload to fail validation, but it passed.');
// }
//
// if (normalizedError) {
//     throw new Error(`Expected normalized payload to pass validation, but got: ${normalizedError.message}`);
// }
//
// console.log('✅ Reproducer complete: legacy payload fails, normalized payload passes.');
// console.log('Legacy validation error excerpt:', legacyError.message);
