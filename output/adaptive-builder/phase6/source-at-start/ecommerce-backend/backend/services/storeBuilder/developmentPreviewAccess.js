'use strict';
const { assertAdaptiveActor } = require('./adaptivePersistencePolicy');
const { getShopPlanAccess } = require('../billing/planAccessService');

// Grants access only to a synthetic, browser-local workspace. This never grants
// adaptive adoption, publication, uploads or access to customer/order records.
async function getDevelopmentPreviewAccess(req) {
    const allowed = new Set(String(process.env.ADAPTIVE_BUILDER_DEV_SHOP_IDS || '').split(',').map(value => value.trim()).filter(value => /^[a-f\d]{24}$/i.test(value)));
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
    if (process.env.NODE_ENV !== 'development' || !local || !allowed.has(String(req.tenantId))) {
        throw Object.assign(new Error('The local Adaptive Builder workspace is unavailable.'), { statusCode: 404, code: 'DEVELOPMENT_PREVIEW_UNAVAILABLE' });
    }
    await assertAdaptiveActor({ shopId: req.tenantId, req });
    const access = await getShopPlanAccess(req.tenantId);
    if (!access.isOperational || access.shopOperational !== true || access.storeBuilderAccess !== 'full' || !access.features?.storeBuilder) {
        throw Object.assign(new Error('An active plan with full Store Builder access is required.'), { statusCode: 403, code: 'DEVELOPMENT_PREVIEW_FORBIDDEN' });
    }
    return { scope: 'synthetic-local-only', actorId: String(req.user._id), shopId: String(req.tenantId), publication: false, uploads: false };
}
module.exports = { getDevelopmentPreviewAccess };
