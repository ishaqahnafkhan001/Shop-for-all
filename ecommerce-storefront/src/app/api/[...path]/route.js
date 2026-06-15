import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOP_BY_HOP_HEADERS = new Set([
    'connection',
    'content-encoding',
    'content-length',
    'host',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
]);

const getBackendApiUrl = () => {
    const configuredUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    if (process.env.NODE_ENV === 'production') {
        return 'https://api.scaleup.codes/api';
    }

    return 'http://localhost:4000/api';
};

const getTargetUrl = async (request, params) => {
    const resolvedParams = await params;
    const path = (resolvedParams?.path || []).join('/');
    const requestUrl = new URL(request.url);

    return `${getBackendApiUrl()}/${path}${requestUrl.search || ''}`;
};

const copyRequestHeaders = (request) => {
    const headers = new Headers(request.headers);

    for (const headerName of HOP_BY_HOP_HEADERS) {
        headers.delete(headerName);
    }

    headers.delete('origin');

    const host = request.headers.get('host') || '';
    const hostname = host.split(':')[0].toLowerCase();
    let subdomain = '';

    if (hostname.includes('.localhost')) {
        subdomain = hostname.split('.localhost')[0];
    } else if (hostname.endsWith('.scaleup.codes')) {
        [subdomain] = hostname.split('.');
    }

    if (subdomain && !['www', 'api', 'admin', 'shop', 'localhost', 'scaleup'].includes(subdomain)) {
        headers.set('x-shop-subdomain', subdomain);
    }

    return headers;
};

const copyResponseHeaders = (upstreamResponse) => {
    const headers = new Headers(upstreamResponse.headers);

    for (const headerName of HOP_BY_HOP_HEADERS) {
        headers.delete(headerName);
    }

    headers.delete('set-cookie');

    return headers;
};

const forwardSetCookieHeaders = (upstreamResponse, response) => {
    const setCookies = typeof upstreamResponse.headers.getSetCookie === 'function'
        ? upstreamResponse.headers.getSetCookie()
        : [];

    if (setCookies.length > 0) {
        setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
        return;
    }

    const setCookie = upstreamResponse.headers.get('set-cookie');
    if (setCookie) {
        response.headers.append('set-cookie', setCookie);
    }
};

async function proxyRequest(request, { params }) {
    const targetUrl = await getTargetUrl(request, params);
    const method = request.method.toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';

    const upstreamResponse = await fetch(targetUrl, {
        method,
        headers: copyRequestHeaders(request),
        body: hasBody ? await request.arrayBuffer() : undefined,
        cache: 'no-store',
        redirect: 'manual',
    });

    const response = new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: copyResponseHeaders(upstreamResponse),
    });

    forwardSetCookieHeaders(upstreamResponse, response);

    return response;
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
