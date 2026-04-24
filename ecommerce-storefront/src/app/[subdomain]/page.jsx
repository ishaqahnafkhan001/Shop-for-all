export default async function VendorStorefront({ params }) {
    // Next.js magically passes the folder name variable as a prop!
    const { subdomain } = await params;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-6">
            {/* We capitalize the first letter just to make it look nice */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to <span className="text-indigo-600 capitalize">{subdomain}</span>'s Store!
            </h1>
            <p className="text-lg text-gray-500">
                This is a fully isolated storefront running on the `{subdomain}` subdomain.
            </p>
        </div>
    );
}