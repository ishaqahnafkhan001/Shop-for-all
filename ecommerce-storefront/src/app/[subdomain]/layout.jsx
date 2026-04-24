import Navbar from '@/components/storefront/Navbar';

export default async function VendorLayout({ children, params }) {
    const { subdomain } = await params;

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Inject our Client Component Navbar here */}
            <Navbar subdomain={subdomain} />

            <main className="flex-grow">{children}</main>

            <footer className="border-t py-12 mt-20 bg-gray-50">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm font-medium">
                    © {new Date().getFullYear()} <span className="capitalize">{subdomain}</span>. Powered by ShopForAll.
                </div>
            </footer>
        </div>
    );
}