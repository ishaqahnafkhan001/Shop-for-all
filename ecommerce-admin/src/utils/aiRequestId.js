export const createAiRequestId = (feature = 'ai') => {
    const id = globalThis.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    return `${feature}:${id}`;
};

export const aiRequestHeaders = (feature) => ({
    'x-ai-request-id': createAiRequestId(feature)
});
