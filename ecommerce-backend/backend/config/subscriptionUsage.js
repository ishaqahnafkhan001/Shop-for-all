const DEFAULT_WARNING_THRESHOLDS = Object.freeze([80, 90, 100]);

const normalizeThresholds = (values) => {
    const normalized = [...new Set((values || [])
        .map(value => Math.round(Number(value)))
        .filter(value => Number.isFinite(value) && value > 0 && value <= 100))]
        .sort((left, right) => left - right);
    return normalized.length ? normalized : [...DEFAULT_WARNING_THRESHOLDS];
};

const getUsageWarningThresholds = () => {
    const configured = String(process.env.SUBSCRIPTION_USAGE_WARNING_THRESHOLDS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
    return normalizeThresholds(configured);
};

module.exports = {
    DEFAULT_WARNING_THRESHOLDS,
    normalizeThresholds,
    getUsageWarningThresholds
};
