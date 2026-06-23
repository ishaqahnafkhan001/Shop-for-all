import StorefrontHomeClient from './StorefrontHomeClient';
import { fetchStorefrontBootstrap } from '@/lib/storefrontServer';

const getInitialStorefrontData = async (subdomain) => {
    try {
        return await fetchStorefrontBootstrap(subdomain, {
            page: 1,
            limit: 9,
            sort: 'newest',
        });
    } catch (error) {
        if ([404, 423].includes(error.status)) {
            return {
                shop: null,
                error: error.body?.error || error.message || 'This storefront is currently unavailable.',
            };
        }

        console.error('Server storefront bootstrap error:', error.message);
        return null;
    }
};

export default async function VendorHomePage({ params }) {
    const { subdomain } = await params;
    const initialData = await getInitialStorefrontData(subdomain);

    return <StorefrontHomeClient subdomain={subdomain} initialData={initialData} />;
}
