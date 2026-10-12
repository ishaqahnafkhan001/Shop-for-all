const MESSAGES = Object.freeze({
    AI_ENTITY_NOT_FOUND: [404, 'Product not found in this store.'],
    AI_INVALID_INPUT: [400, 'Check the requested fields and supported language preferences.'],
    AI_ACCOUNTING_CUTOVER_REQUIRED: [503, 'AI generation is temporarily unavailable. Please contact support.'],
    AI_CAPACITY_PENDING: [409, 'Other AI operations are processing or recovering. Retry this operation shortly.'],
    AI_WINDOW_PENDING: [409, 'The weekly allowance is resetting. Retry shortly.'],
    AI_SETTLEMENT_PENDING: [409, 'Your operation is recovering. Retry the same operation to check its result.'],
    AI_REQUEST_INPUT_CONFLICT: [409, 'The input changed. Choose Regenerate to start a new operation.'],
    AI_RESULT_NOT_ACCEPTED: [409, 'This operation expired or is recovering. Retry the same operation.'],
    AI_REQUEST_FAILED: [409, 'This operation failed. Choose Regenerate to start a new operation.'],
    AI_NOT_CONFIGURED: [503, 'AI generation is temporarily unavailable. Please contact support.']
});
const sendAiOperationError = (res, error) => {
    const entry = MESSAGES[error?.code];
    if (!entry) return false;
    const [status, message] = entry;
    res.status(status).json({ success: false, code: error.code, message, error: message, ...(error.usage ? { usage: error.usage } : {}) });
    return true;
};
module.exports = { sendAiOperationError };
