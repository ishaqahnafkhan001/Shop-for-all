import { NextResponse } from 'next/server';

// 1. Tell Next.js which paths the middleware should run on.
// We exclude static files, images, and the Next.js internal API so it stays fast.
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

export default function middleware(req) {
    const url = req.nextUrl;

    // 2. Get the hostname (e.g., 'localhost:3000' or 'apple.localhost:3000')
    const hostname = req.headers.get('host') || '';

    // 3. Extract the subdomain by removing the base domain
    // (When you go to production, you will add your real domain string here like `.yourdomain.com`)
    let subdomain = hostname
        .replace('.localhost:3000', '')
        .replace('localhost:3000', '');

    // 4. If there is no subdomain (or it's just 'www'), let them view the main Platform Landing Page
    if (subdomain === '' || subdomain === 'www') {
        return NextResponse.next();
    }

    // 5. If a subdomain EXISTS, magically rewrite the URL to point to our hidden `[subdomain]` folder!
    // Example: apple.localhost:3000/cart -> /apple/cart
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
}