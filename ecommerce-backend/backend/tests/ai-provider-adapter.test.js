const test = require('node:test');
const assert = require('node:assert/strict');
const { getEventListeners } = require('node:events');
const { createProviderSession, withProviderSession, extractUsage, toStrictSchema, extractText } = require('../services/ai/openaiProviderAdapter');
const config = { apiKey: 'mock-only', model: 'gpt-6-luna', operationTimeoutMs: 1000, attemptTimeoutMs: 1000, outputTokens: 2400 };
const args = { prompt: 'Synthetic product context', feature: 'product.content', schema: { type: 'object', properties: { description: { type: 'string' } }, required: ['description'] } };
const factory = run => () => ({ responses: { create: run } });

test('missing OpenAI key starts no provider work', async () => {
    let calls = 0;
    await assert.rejects(withProviderSession({ config: { ...config, apiKey: '' },
        clientFactory: () => { calls++; throw new Error('Must not construct a client'); }
    }, session => session.generate(args)), { code: 'AI_NOT_CONFIGURED' });
    assert.equal(calls, 0);
});

test('already aborted signal starts no provider calls and leaves no external listeners', async () => {
    let calls = 0; const controller = new AbortController(); controller.abort();
    await assert.rejects(withProviderSession({ signal: controller.signal, config,
        clientFactory: factory(() => { calls++; }) }, session => session.generate(args)), { code: 'AI_OPERATION_CANCELLED' });
    assert.equal(calls, 0); assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('installed SDK receives AbortSignal and local deadline aborts its fetch', async t => {
    let transportAborted = false;
    t.mock.method(globalThis, 'fetch', (_, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => { transportAborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    }));
    const attempts = [];
    await assert.rejects(withProviderSession({ config: { ...config, operationTimeoutMs: 30 }, onAttempt: value => attempts.push(value) }, session => session.generate(args)), { code: 'AI_PROVIDER_TIMEOUT' });
    assert.equal(transportAborted, true);
    assert.equal(attempts[0].outcome, 'unknown'); assert.equal(attempts[0].totalTokens, null);
});

test('provider statuses are safe, classified, and never transport retried', async () => {
    const expected = { 400: 'AI_PROVIDER_BAD_REQUEST', 401: 'AI_PROVIDER_AUTH_FAILED', 403: 'AI_PROVIDER_AUTH_FAILED',
        404: 'AI_MODEL_NOT_FOUND', 429: 'AI_PROVIDER_RATE_LIMITED', 500: 'AI_PROVIDER_UNAVAILABLE', 503: 'AI_PROVIDER_UNAVAILABLE' };
    for (const [status, code] of Object.entries(expected)) {
        let calls = 0;
        await assert.rejects(withProviderSession({ config, clientFactory: factory(async () => {
            calls++; throw Object.assign(new Error('Sensitive provider payload'), { status: Number(status) });
        }) }, session => session.generate(args)), error => error.code === code && !error.message.includes('Sensitive'));
        assert.equal(calls, 1);
    }
});

test('reported tokens retained, absent tokens unknown; telemetry failures cannot fail a response', async () => {
    const text = await withProviderSession({ config, onAttempt: () => { throw new Error('Telemetry failed'); },
        clientFactory: factory(async () => ({ status: 'completed', output_text: '{"description":"Useful"}',
            usage: { input_tokens: 40, output_tokens: 10, total_tokens: 50 } }))
    }, async session => {
        const value = await session.generate(args);
        assert.equal(session.attempts[0].totalTokens, 50);
        return value;
    });
    assert.ok(text.includes('Useful'));
    assert.deepEqual(extractUsage({}), { inputTokens: null, outputTokens: null, totalTokens: null });
});

test('late response after cancellation cannot return a result; listeners are removed', async () => {
    const controller = new AbortController(); let resolve, started;
    const didStart = new Promise(done => { started = done; });
    const session = createProviderSession({ signal: controller.signal, config, clientFactory: factory(() => new Promise(done => { resolve = done; started(); })) });
    const result = session.generate(args); await didStart; controller.abort();
    await assert.rejects(result, { code: 'AI_OPERATION_CANCELLED' });
    resolve({ status: 'completed', output_text: 'late' }); session.close();
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
    assert.equal(getEventListeners(session.signal, 'abort').length, 0);
});

test('strict JSON schema closes every object and preserves optional fields as nullable', () => {
    const input = { type: 'object', properties: { name: { type: 'string' }, details: { type: 'array', maxItems: 3,
        items: { type: 'object', properties: { label: { type: 'string' } } } } }, required: ['name'] };
    const result = toStrictSchema(input);
    assert.deepEqual(result.required, ['name', 'details']);
    assert.equal(result.additionalProperties, false);
    assert.deepEqual(result.properties.details.anyOf[1], { type: 'null' });
    assert.equal(result.properties.details.anyOf[0].items.additionalProperties, false);
    assert.equal(input.additionalProperties, undefined);
});

test('refused, incomplete and empty responses are not accepted as successful output', async () => {
    assert.throws(() => extractText({ status: 'completed', output_text: '{"description":"Ignored"}',
        output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'Sensitive refusal details' }] }] }), { code: 'AI_RESPONSE_REFUSED' });
    assert.throws(() => extractText({ status: 'incomplete', output_text: '{"description":"Partial"}' }), { code: 'AI_RESPONSE_INCOMPLETE' });
    await assert.rejects(withProviderSession({ config, clientFactory: factory(async () => ({ status: 'completed', output: [] })) }, session => session.generate(args)), { code: 'AI_RESPONSE_EMPTY' });
});

test('installed SDK uses Responses JSON schema, inline images, no storage and no automatic retries', async t => {
    let request;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        request = { url: String(url), body: JSON.parse(options.body) };
        return Response.json({ object: 'response', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"description":"Useful"}' }] }], usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 } });
    });
    const result = await withProviderSession({ config }, session => session.generate({ ...args, imagePart: { mimeType: 'image/jpeg', data: 'syntheticBase64' } }));
    assert.match(result, /Useful/);
    assert.equal(request.url, 'https://api.openai.com/v1/responses');
    assert.equal(request.body.store, false);
    assert.equal(request.body.model, 'gpt-6-luna');
    assert.deepEqual(request.body.reasoning, { effort: 'none' });
    assert.equal(request.body.temperature, undefined);
    assert.equal(request.body.top_p, undefined);
    assert.equal(request.body.text.format.strict, true);
    assert.equal(request.body.text.format.schema.additionalProperties, false);
    assert.equal(request.body.input[0].content[1].image_url, 'data:image/jpeg;base64,syntheticBase64');
    for (const status of [429, 500]) {
        let calls = 0;
        t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ error: { message: 'Private error', type: 'test' } }, { status }); });
        await assert.rejects(withProviderSession({ config }, session => session.generate(args)), error => !error.message.includes('Private error'));
        assert.equal(calls, 1);
    }
});
