const Ledger = require('../../models/AiGenerationRequest');
const { getAiConfig } = require('../../config/ai');

// Called only by the existing platform-operations permission boundary.
const getAiHealth = async () => {
    const config = getAiConfig();
    const since = new Date(Date.now() - 86400000);
    try {
        const [outcomes, staleOperations, lastAccepted] = await Promise.all([
            Ledger.aggregate([
                { $match: { createdAt: { $gte: since }, accountingVersion: 2 } },
                { $unwind: '$attempts' },
                { $match: { 'attempts.provider': config.provider } },
                { $group: { _id: '$attempts.outcome', count: { $sum: 1 }, lastAt: { $max: '$attempts.startedAt' },
                    reportedTokens: { $sum: { $ifNull: ['$attempts.totalTokens', 0] } },
                    unknownTokenAttempts: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$attempts.totalTokens', null] }, null] }, 1, 0] } } } }
            ]).option({ maxTimeMS: 2000 }),
            Ledger.countDocuments({ accountingVersion: 2, status: { $in: ['reserving', 'in_progress', 'outcome_ready'] },
                deadline: { $lt: new Date() } }).maxTimeMS(2000),
            Ledger.findOne({ accountingVersion: 2, createdAt: { $gte: since }, status: 'completed', source: { $in: ['provider', 'mixed'] }, 'provenance.provider': config.provider })
                .sort({ createdAt: -1 }).select('accountingAcknowledgedAt').maxTimeMS(2000).lean()
        ]);
        const counts = Object.fromEntries(outcomes.map(row => [row._id, row.count]));
        return { provider: config.provider, model: config.model, configured: Boolean(config.apiKey), accountingEnabled: config.accountingVersion === 2,
            state: !config.apiKey ? 'unconfigured' : config.accountingVersion !== 2 ? 'cutover_required'
                : staleOperations || counts.unknown || counts.failed ? 'needs_attention' : counts.response ? 'recent_responses_observed' : 'no_recent_attempts',
            windowHours: 24, staleOperations, attempts: counts,
            lastProviderResponseAt: outcomes.find(row => row._id === 'response')?.lastAt || null,
            lastAcceptedGenerationAt: lastAccepted?.accountingAcknowledgedAt || null,
            lastProviderFailureAt: outcomes.filter(row => ['failed', 'unknown'].includes(row._id)).map(row => row.lastAt).filter(Boolean).sort((a, b) => b - a)[0] || null,
            lastAttemptAt: outcomes.map(row => row.lastAt).filter(Boolean).sort((a, b) => b - a)[0] || null,
            reportedTokens: outcomes.reduce((sum, row) => sum + row.reportedTokens, 0),
            unknownTokenAttempts: outcomes.reduce((sum, row) => sum + row.unknownTokenAttempts, 0),
            providerCost: null, note: 'Reported token totals exclude unknown usage. Remote billing is not inferred from app quota.' };
    } catch {
        return { provider: config.provider, model: config.model, configured: Boolean(config.apiKey), accountingEnabled: config.accountingVersion === 2, state: 'telemetry_unavailable', providerCost: null };
    }
};
module.exports = { getAiHealth };
