import Navbar from '@/components/storefront/Navbar';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import StorefrontThemeProvider from '@/components/storefront/StorefrontThemeProvider';
import AnalyticsConsentBanner from '@/components/storefront/AnalyticsConsentBanner';
// ✨ IMPORT THE CART PROVIDER ✨
import { CartProvider } from '@/context/CartContext';
// (Make sure to also import your Toaster if you are using react-hot-toast!)
import { Toaster } from 'react-hot-toast';

export default async function VendorLayout({ children, params }) {
    const { subdomain } = await params;

    return (
        <StorefrontThemeProvider subdomain={subdomain}>
            <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[var(--sf-background)]">

                {/* Wrap everything in the CartProvider and pass the subdomain */}
                <CartProvider subdomain={subdomain}>

                    {/* For popup notifications */}
                    <Toaster position="bottom-right" />

                    <Navbar subdomain={subdomain} />

                    <main className="min-w-0 flex-grow">{children}</main>

                    <StorefrontFooter subdomain={subdomain} />

                    <AnalyticsConsentBanner />

                </CartProvider>

            </div>
        </StorefrontThemeProvider>
    );
}
