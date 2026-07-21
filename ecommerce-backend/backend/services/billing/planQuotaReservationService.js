const crypto = require('crypto');
const PlanQuotaReservation = require('../../models/PlanQuotaReservation');

const RESERVATION_TTL_MS = 5 * 60 * 1000;

const reserveQuota = async ({ shopId, resource, requested = 1, limit, getCommittedUsage }) => {
    if (limit === null) return null;
    const amount = Math.max(1, Math.floor(Number(requested) || 1));

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const now = new Date();
        await PlanQuotaReservation.deleteMany({ expiresAt: { $lte: now } });
        const [committed, reserved] = await Promise.all([
            getCommittedUsage(),
            PlanQuotaReservation.countDocuments({ shopId, resource, expiresAt: { $gt: now } })
        ]);

        if (committed + reserved + amount > Number(limit)) {
            const error = new Error(`The ${resource} limit for this plan has been reached.`);
            error.code = 'PLAN_LIMIT_REACHED';
            error.usage = committed;
            error.limit = Number(limit);
            throw error;
        }

        const operationId = crypto.randomUUID();
        const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);
        const documents = Array.from({ length: amount }, (_, index) => ({
            shopId,
            resource,
            slot: committed + reserved + index + 1,
            operationId,
            expiresAt
        }));

        try {
            await PlanQuotaReservation.insertMany(documents, { ordered: true });
            return { operationId, shopId, resource };
        } catch (error) {
            await PlanQuotaReservation.deleteMany({ operationId });
            if (error?.code !== 11000 || attempt === 4) throw error;
        }
    }

    throw new Error('Unable to reserve plan capacity. Please retry.');
};

const releaseQuota = async (reservation) => {
    if (!reservation?.operationId) return;
    await PlanQuotaReservation.deleteMany({ operationId: reservation.operationId });
};

const releaseQuotaSafely = (reservation) => {
    if (!reservation) return;
    releaseQuota(reservation).catch(() => {});
};

module.exports = {
    RESERVATION_TTL_MS,
    reserveQuota,
    releaseQuota,
    releaseQuotaSafely
};
