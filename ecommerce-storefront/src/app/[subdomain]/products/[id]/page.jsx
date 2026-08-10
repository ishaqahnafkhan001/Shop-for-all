import ProductDetails from '@/components/product/ProductDetails';
import {
    fetchStorefrontInfo,
    fetchStorefrontProduct,
    getStorefrontPlanRedirectUrl
} from '@/lib/storefrontServer';
import { headers } from 'next/headers';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import {
    buildBreadcrumbJsonLd,
    buildStorefrontMetadata,
    buildProductJsonLd,
    getCategoryCanonicalUrl,
    getHomepageCanonicalUrl,
    getOgImage,
    getProductCanonicalUrl,
    getProductSeoDescription,
    getProductSeoTitle,
    noindexMetadata
} from '@/lib/seo';
import { resolveStorefrontIndexability } from '@/lib/indexability';

const getInitialProduct = async (subdomain, id, host = '', fresh = false) => {
    try {
        return await fetchStorefrontProduct(subdomain, id, { storefrontHost: host, fresh });
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(error, `/products/${encodeURIComponent(id)}`);
        if (redirectTo) return { __redirectTo: redirectTo };
        if (![404, 423].includes(error.status)) {
            console.error('Server product detail fetch error:', error.message);
        }
        return { __status: error.status || 500 };
    }
};

const getStoreInfo = async (subdomain, host = '', fresh = false) => {
    try {
        return await fetchStorefrontInfo(subdomain, { storefrontHost: host, fresh });
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(error, '/');
        if (redirectTo) return { __redirectTo: redirectTo };
        if (![404, 423].includes(error.status)) {
            console.error('Server shop info fetch error:', error.message);
        }
        return { __status: error.status || 500 };
    }
};

const stringifyJsonLd = (jsonLd) => JSON.stringify(jsonLd).replace(/</g, '\\u003c');

export async function generateMetadata({ params }) {
    const { subdomain, id } = await params;
    const headerStore = await headers();
    const host = headerStore.get('host') || '';

    const [product, shop] = await Promise.all([
        getInitialProduct(subdomain, id, host, true),
        getStoreInfo(subdomain, host, true)
    ]);

    if (!product || product.__status || product.__redirectTo || shop?.__status || shop?.__redirectTo) {
        return noindexMetadata('Product unavailable', 'This product is currently unavailable.');
    }

    const url = getProductCanonicalUrl({ host, subdomain, shop, product });
    const indexability = resolveStorefrontIndexability({
        shop,
        resource: product,
        resourceType: 'product',
        host,
        subdomain,
        canonicalPath: `/products/${product.slug || product._id}`
    });

    return buildStorefrontMetadata({
        shop,
        pageTitle: getProductSeoTitle(product, shop),
        description: getProductSeoDescription(product, shop),
        url,
        image: getOgImage(product, shop),
        type: 'website',
        isIndexable: indexability.indexable,
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
    if (initialProduct?.__redirectTo || shop?.__redirectTo) {
        redirect(initialProduct?.__redirectTo || shop.__redirectTo);
    }
    if (initialProduct?.__status === 404 || shop?.__status === 404) notFound();
    const publicProduct = initialProduct?.__status ? null : initialProduct;
    const publicShop = shop?.__status ? null : shop;

    if (publicProduct?.slug && String(id).toLowerCase() !== String(publicProduct.slug).toLowerCase()) {
        permanentRedirect(`/products/${publicProduct.slug}`);
    }

    const productUrl = publicProduct
        ? getProductCanonicalUrl({ host, subdomain, shop: publicShop, product: publicProduct })
        : '';
    const homepageUrl = getHomepageCanonicalUrl({ host, subdomain, shop: publicShop });
    const categoryUrl = publicProduct?.category
        ? getCategoryCanonicalUrl({ host, subdomain, shop: publicShop, category: publicProduct.category })
        : homepageUrl;
    const indexability = resolveStorefrontIndexability({
        shop: publicShop,
        resource: publicProduct,
        resourceType: 'product',
        host,
        subdomain,
        canonicalPath: `/products/${publicProduct?.slug || publicProduct?._id || id}`
    });
    const productJsonLd = publicProduct && indexability.structuredDataEligible ? buildProductJsonLd({
        product: publicProduct,
        shop: publicShop,
        url: productUrl
    }) : null;
    const breadcrumbJsonLd = publicProduct && indexability.structuredDataEligible ? buildBreadcrumbJsonLd({
        items: [
            { name: publicShop?.shopName || publicShop?.name || 'Store', url: homepageUrl },
            { name: publicProduct.category || 'Products', url: categoryUrl },
            { name: publicProduct.title, url: productUrl }
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
            <ProductDetails subdomain={subdomain} id={publicProduct?.slug || id} initialProduct={publicProduct} />
        </>
    );
}
