const assert = require('node:assert/strict');
const test = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const {
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    createCsrfToken,
    csrfProtection,
    isValidCsrfToken
} = require('../middlewares/csrf');

const runMiddleware = (req) => new Promise((resolve) => {
    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            resolve({ nextCalled: false, res: this });
            return this;
        }
    };

    csrfProtection(req, res, () => resolve({ nextCalled: true, res }));
});

const makeReq = ({ method = 'POST', path = '/api/admin/products', token } = {}) => ({
    method,
    originalUrl: path,
    url: path,
    cookies: token ? { [CSRF_COOKIE_NAME]: token } : {},
    get(name) {
        return String(name).toLowerCase() === CSRF_HEADER_NAME ? token : undefined;
    }
});

test('protected POST without csrf token returns 403', async () => {
    const result = await runMiddleware(makeReq());

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
    assert.equal(result.res.body.error, 'Invalid CSRF token');
});

test('protected POST with valid csrf token reaches next handler', async () => {
    const token = createCsrfToken();
    const result = await runMiddleware(makeReq({ token }));

    assert.equal(isValidCsrfToken(token), true);
    assert.equal(result.nextCalled, true);
    assert.equal(result.res.statusCode, 200);
});

test('GET route and login route do not require csrf token', async () => {
    const getResult = await runMiddleware(makeReq({ method: 'GET', path: '/api/admin/products' }));
    const loginResult = await runMiddleware(makeReq({ method: 'POST', path: '/api/auth/login' }));

    assert.equal(getResult.nextCalled, true);
    assert.equal(loginResult.nextCalled, true);
});
