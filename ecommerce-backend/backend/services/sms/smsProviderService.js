const { maskPhone, normalizeBDPhone, toLocalBDPhone } = require('../../utils/phoneUtils');

const DEFAULT_TIMEOUT_MS = 8000;

class SmsProviderError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'SmsProviderError';
        this.details = details;
    }
}

const getSmsConfig = () => ({
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || '',
    baseUrl: String(process.env.SMS_API_BASE_URL || '').replace(/\/$/, ''),
    phoneFormat: String(process.env.SMS_PROVIDER_PHONE_FORMAT || 'local').toLowerCase(),
    includeSid: String(process.env.SMS_INCLUDE_SID || 'true').toLowerCase() !== 'false',
    mockMode: String(process.env.SMS_MOCK_MODE || '').toLowerCase() === 'true'
});

const assertSmsConfig = (config) => {
    if (config.mockMode) return;
    if (!config.apiKey || !config.baseUrl) {
        throw new SmsProviderError('SMS provider is not configured');
    }
};

const pickSafeProviderFields = (providerResponse = {}) => {
    if (!providerResponse || typeof providerResponse !== 'object') return {};
    const safe = {};
    for (const key of ['status', 'success', 'message', 'error', 'errors', 'code']) {
        if (providerResponse[key] !== undefined) safe[key] = providerResponse[key];
    }
    return safe;
};

const readProviderResponse = async (response) => {
    const text = await response.text().catch(() => '');
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { message: text.slice(0, 300) };
    }
};

const logProviderRejection = ({ status, providerResponse, maskedPhone, sidIncluded, phoneFormat }) => {
    console.warn('SMS provider rejected request', {
        status,
        phone: maskedPhone,
        sidIncluded,
        phoneFormat,
        providerResponse: pickSafeProviderFields(providerResponse)
    });
};

const postSms = async ({ config, body, signal }) => {
    const response = await fetch(`${config.baseUrl}/api/v1/send-sms`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(body),
        signal
    });

    const providerResponse = await readProviderResponse(response);
    return { response, providerResponse };
};

const sendSms = async ({ mobile, message, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
    const normalizedMobile = normalizeBDPhone(mobile);
    if (!normalizedMobile) {
        throw new SmsProviderError('Invalid Bangladesh mobile number');
    }

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
        throw new SmsProviderError('SMS message is required');
    }

    const config = getSmsConfig();
    assertSmsConfig(config);
    const providerMobile = config.phoneFormat === 'normalized'
        ? normalizedMobile
        : toLocalBDPhone(normalizedMobile);

    if (config.mockMode) {
        console.info(`SMS mock sent to ${maskPhone(normalizedMobile)}`);
        return {
            success: true,
            mocked: true,
            providerResponse: { status: 'mocked' }
        };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const baseBody = {
        mobile: providerMobile,
        message: cleanMessage
    };
    const shouldIncludeSid = Boolean(config.senderId && config.includeSid);
    const primaryBody = shouldIncludeSid
        ? { ...baseBody, sid: config.senderId }
        : baseBody;

    try {
        let { response, providerResponse } = await postSms({
            config,
            body: primaryBody,
            signal: controller.signal
        });

        if (!response.ok && shouldIncludeSid) {
            logProviderRejection({
                status: response.status,
                providerResponse,
                maskedPhone: maskPhone(normalizedMobile),
                sidIncluded: true,
                phoneFormat: config.phoneFormat
            });

            ({ response, providerResponse } = await postSms({
                config,
                body: baseBody,
                signal: controller.signal
            }));
        }

        if (!response.ok) {
            logProviderRejection({
                status: response.status,
                providerResponse,
                maskedPhone: maskPhone(normalizedMobile),
                sidIncluded: false,
                phoneFormat: config.phoneFormat
            });

            throw new SmsProviderError('SMS provider rejected the request', {
                status: response.status,
                providerResponse: pickSafeProviderFields(providerResponse)
            });
        }

        return {
            success: true,
            providerResponse
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new SmsProviderError('SMS provider request timed out');
        }
        if (error instanceof SmsProviderError) throw error;
        throw new SmsProviderError('SMS provider request failed');
    } finally {
        clearTimeout(timer);
    }
};

module.exports = {
    SmsProviderError,
    getSmsConfig,
    sendSms
};
