import {getStorefrontPresentationVariant} from '@scaleup/storefront-theme';
import Navbar from '@/components/storefront/Navbar';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import StorefrontThemeProvider from '@/components/storefront/StorefrontThemeProvider';
import AnalyticsConsentBanner from '@/components/storefront/AnalyticsConsentBanner';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getPublishedStorefrontSettings } from '@/lib/storefrontPublishedSettings';
import { getStorefrontPlanRedirectUrl } from '@/lib/storefrontServer';
import StorefrontRevisionWatcher from '@/components/storefront/StorefrontRevisionWatcher';
// ✨ IMPORT THE CART PROVIDER ✨
import { CartProvider } from '@/context/CartContext';
// (Make sure to also import your Toaster if you are using react-hot-toast!)
import { Toaster } from 'react-hot-toast';

export default async function VendorLayout({ children, params }) {
    const { subdomain } = await params;
    const headerStore = await headers();
    const host = headerStore.get('host') || '';
    let settings;
    try {
        settings = await getPublishedStorefrontSettings(subdomain, host);
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(error, headerStore.get('x-storefront-pathname') || '/');
        if (redirectTo) redirect(redirectTo);
        if ([404, 423].includes(error.status)) notFound();
        // A failed theme lookup must not render a default or another store's UI.
        return (
            <main className="mx-auto max-w-lg p-8" role="alert">
                <h1 className="text-2xl font-semibold">Store temporarily unavailable</h1>
                <p className="mt-3">We could not load this store. Please try again.</p>
                <a href="" className="mt-4 inline-block underline">Reload store</a>
            </main>
        );
    }

    return (
        <StorefrontThemeProvider key={`${host}:${subdomain}`} subdomain={subdomain} settings={settings}>
            <StorefrontRevisionWatcher subdomain={subdomain} shopId={String(settings._id)} revision={Number(settings.themeRevision || 0)} />
            <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[var(--sf-background)]">

                {/* Wrap everything in the CartProvider and pass the subdomain */}
                <CartProvider subdomain={subdomain}>

                    {/* For popup notifications */}
                    <Toaster position={getStorefrontPresentationVariant(settings.theme) === 'atelier-editorial' ? 'top-right' : 'bottom-right'} {...(getStorefrontPresentationVariant(settings.theme) === 'atelier-editorial' ? {
                        containerStyle: {top: '1rem', zIndex: 100},
                        toastOptions: {style: {background: 'var(--foreground)',color: 'var(--background)',fontFamily: 'var(--sf-body-font)',borderRadius: '4px'}}
                    } : {})} />

                    <Navbar subdomain={subdomain} />

                    <main className="min-w-0 flex-grow">{children}</main>

                    <StorefrontFooter subdomain={subdomain} />

                    <AnalyticsConsentBanner />

                </CartProvider>

            </div>
        </StorefrontThemeProvider>
    );
}
