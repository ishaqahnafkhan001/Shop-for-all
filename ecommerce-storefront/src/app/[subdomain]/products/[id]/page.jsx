import ProductDetails from '@/components/product/ProductDetails';
import { fetchStorefrontProduct } from '@/lib/storefrontServer';

const getInitialProduct = async (subdomain, id) => {
    try {
        return await fetchStorefrontProduct(subdomain, id);
    } catch (error) {
        if (![404, 423].includes(error.status)) {
            console.error('Server product detail fetch error:', error.message);
        }
        return null;
    }
};

export default async function Page({ params }) {
    const { subdomain, id } = await params;
    const initialProduct = await getInitialProduct(subdomain, id);

    return <ProductDetails subdomain={subdomain} id={id} initialProduct={initialProduct} />;
}
