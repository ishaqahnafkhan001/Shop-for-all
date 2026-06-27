import { NextResponse } from 'next/server';

const PLATFORM_DOMAIN = 'scaleup.codes';
const RESERVED_HOSTS = new Set([
    PLATFORM_DOMAIN,
    `www.${PLATFORM_DOMAIN}`,
    `shop.${PLATFORM_DOMAIN}`,
    `admin.${PLATFORM_DOMAIN}`,
    `api.${PLATFORM_DOMAIN}`,
    'localhost',
    '127.0.0.1'
]);
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'shop', 'scaleup']);

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

const getHostname = (host = '') => String(host || '').toLowerCase().split(':')[0].replace(/^\.+|\.+$/g, '');

export default function middleware(req) {
    const url = req.nextUrl;
    const hostname = getHostname(req.headers.get('host') || '');

    if (!hostname || RESERVED_HOSTS.has(hostname)) {
        return NextResponse.next();
    }

    if (hostname.endsWith('.localhost')) {
        const subdomain = hostname.slice(0, -'.localhost'.length);
        if (subdomain && !subdomain.includes('.')) {
            return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
        }
    }

    if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
        const subdomain = hostname.slice(0, -`.${PLATFORM_DOMAIN}`.length);
        if (subdomain && !subdomain.includes('.') && !RESERVED_SUBDOMAINS.has(subdomain)) {
            return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
        }

        return NextResponse.next();
    }

    return NextResponse.rewrite(new URL(`/${hostname}${url.pathname}`, req.url));
}
