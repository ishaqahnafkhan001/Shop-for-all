import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/context/CartContext";
import StorefrontThemeProvider from "@/components/storefront/StorefrontThemeProvider";
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext'; // 🌟 Import the Provider

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    metadataBase: new URL("https://www.scaleup.codes"),
    title: {
        default: "Scaleup | Launch Your Online Store Without Coding",
        template: "%s | Scaleup",
    },
    description: "Create a professional online store with Scaleup. Build your storefront, manage products, orders, customers, themes, SEO, and growth tools from one simple dashboard.",
};

export default function RootLayout({ children }) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="min-h-full flex flex-col bg-white text-gray-900">
        <AuthProvider>
            <StorefrontThemeProvider>
                {/* ✨ Wrap everything in CartProvider so the cart works across all pages */}
                <CartProvider>
                    {children}

                    {/* ✨ Toast notifications for 'Added to Cart' or 'Error' messages */}
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#333',
                                color: '#fff',
                                borderRadius: '10px',
                            },
                        }}
                    />
                </CartProvider>
            </StorefrontThemeProvider>
        </AuthProvider> {/* 🌟 ADDED CLOSING TAG HERE */}
        </body>
        </html>
    );
}
