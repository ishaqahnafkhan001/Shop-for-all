import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/context/CartContext";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "ShopForAll | Multi-Tenant E-commerce",
    description: "The ultimate platform for independent vendors.",
};

export default function RootLayout({ children }) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="min-h-full flex flex-col bg-white text-gray-900">
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
        </body>
        </html>
    );
}