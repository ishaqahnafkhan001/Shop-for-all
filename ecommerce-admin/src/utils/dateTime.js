export const localDateTimeToUtcIso = (value) => {
    const input = String(value || '').trim();
    if (!input) return undefined;

    const date = new Date(input);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};

export const getBrowserTimeZoneLabel = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time';
    } catch {
        return 'your local time';
    }
};
