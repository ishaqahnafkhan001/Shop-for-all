import Navbar from '@/components/storefront/Navbar';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import StorefrontThemeProvider from '@/components/storefront/StorefrontThemeProvider';
// ✨ IMPORT THE CART PROVIDER ✨
import { CartProvider } from '@/context/CartContext';
// (Make sure to also import your Toaster if you are using react-hot-toast!)
import { Toaster } from 'react-hot-toast';

export default async function VendorLayout({ children, params }) {
    const { subdomain } = await params;

    return (
        <StorefrontThemeProvider subdomain={subdomain}>
            <div className="min-h-screen bg-[var(--sf-background)] flex flex-col">

                {/* Wrap everything in the CartProvider and pass the subdomain */}
                <CartProvider subdomain={subdomain}>

                    {/* For popup notifications */}
                    <Toaster position="bottom-right" />

                    <Navbar subdomain={subdomain} />

                    <main className="flex-grow">{children}</main>

                    <StorefrontFooter subdomain={subdomain} />

                </CartProvider>

            </div>
        </StorefrontThemeProvider>
    );
}
