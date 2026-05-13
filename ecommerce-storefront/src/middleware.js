import { NextResponse } from 'next/server';

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

export default function middleware(req) {
    const url = req.nextUrl;
    const hostname = req.headers.get('host') || '';

    // 🌟 Safely extract the subdomain for BOTH Local and Production 🌟
    let subdomain = hostname
        .replace('.scaleup.codes', '') // Removes production domain
        .replace('scaleup.codes', '')  // Failsafe for root production domain
        .replace('.localhost:3000', '') // Removes local domain
        .replace('localhost:3000', ''); // Failsafe for root local domain

    // 🛑 Bypass for your main platform pages
    // If the hostname is empty, 'www', or your main 'shop' frontend, render normally.
    if (subdomain === '' || subdomain === 'www' || subdomain === 'shop' || subdomain === 'admin') {
        return NextResponse.next();
    }

    // ✨ The Magic Rewrite
    // example: user visits 'nike.scaleup.codes/cart'
    // Next.js secretly loads the code from '/app/nike/cart' (or pages/nike/cart)
    return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
}
