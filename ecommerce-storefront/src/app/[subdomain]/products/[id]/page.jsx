import ProductDetails from '@/components/product/ProductDetails';
import { fetchStorefrontInfo, fetchStorefrontProduct } from '@/lib/storefrontServer';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
    buildBreadcrumbJsonLd,
    buildMetadata,
    buildProductJsonLd,
    getHomepageCanonicalUrl,
    getOgImage,
    getProductCanonicalUrl,
    getProductSeoDescription,
    getProductSeoTitle,
    isObjectId,
    isShopSearchVisible,
    noindexMetadata
} from '@/lib/seo';

const getInitialProduct = async (subdomain, id, host = '') => {
    try {
        return await fetchStorefrontProduct(subdomain, id, { storefrontHost: host });
    } catch (error) {
        if (![404, 423].includes(error.status)) {
            console.error('Server product detail fetch error:', error.message);
        }
        return null;
    }
};

const getStoreInfo = async (subdomain, host = '') => {
    try {
        return await fetchStorefrontInfo(subdomain, { storefrontHost: host });
    } catch (error) {
        if (![404, 423].includes(error.status)) {
            console.error('Server shop info fetch error:', error.message);
        }
        return null;
    }
};

const stringifyJsonLd = (jsonLd) => JSON.stringify(jsonLd).replace(/</g, '\\u003c');

export async function generateMetadata({ params }) {
    const { subdomain, id } = await params;
    const headerStore = await headers();
    const host = headerStore.get('host') || '';

    const [product, shop] = await Promise.all([
        getInitialProduct(subdomain, id, host),
        getStoreInfo(subdomain, host)
    ]);

    if (!product) {
        return noindexMetadata('Product unavailable', 'This product is currently unavailable.');
    }

    const url = getProductCanonicalUrl({ host, subdomain, shop, product });

    return buildMetadata({
        title: getProductSeoTitle(product, shop),
        description: getProductSeoDescription(product, shop),
        url,
        image: getOgImage(product, shop),
        type: 'website',
        isIndexable: isShopSearchVisible(shop),
        googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ''
    });
}

export default async function Page({ params }) {
    const { subdomain, id } = await params;
    const headerStore = await headers();
    const host = headerStore.get('host') || '';
    const [initialProduct, shop] = await Promise.all([
        getInitialProduct(subdomain, id, host),
        getStoreInfo(subdomain, host)
    ]);

    if (initialProduct?.slug && isObjectId(id)) {
        redirect(`/products/${initialProduct.slug}`);
    }

    const productUrl = initialProduct
        ? getProductCanonicalUrl({ host, subdomain, shop, product: initialProduct })
        : '';
    const homepageUrl = getHomepageCanonicalUrl({ host, subdomain, shop });
    const productJsonLd = initialProduct ? buildProductJsonLd({
        product: initialProduct,
        shop,
        url: productUrl
    }) : null;
    const breadcrumbJsonLd = initialProduct ? buildBreadcrumbJsonLd({
        items: [
            { name: shop?.shopName || shop?.name || 'Store', url: homepageUrl },
            { name: initialProduct.category || 'Products', url: homepageUrl },
            { name: initialProduct.title, url: productUrl }
        ]
    }) : null;

    return (
        <>
            {productJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: stringifyJsonLd(productJsonLd) }}
                />
            )}
            {breadcrumbJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
                />
            )}
            <ProductDetails subdomain={subdomain} id={initialProduct?.slug || id} initialProduct={initialProduct} />
        </>
    );
}
