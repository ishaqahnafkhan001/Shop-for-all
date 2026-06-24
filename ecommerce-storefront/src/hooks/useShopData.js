import { useState, useEffect, useRef } from 'react';
import API from '../api/api';
import { getImageUrlFromValue } from '../lib/seo';

const normalizeProduct = (p) => {
    const sellingPrice = p?.pricing?.sellingPrice ?? p?.sellingPrice ?? 0;
    const discount = p?.pricing?.discount ?? p?.discount ?? 0;
    const finalPrice = p?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * (discount / 100)));
    return {
        ...p,
        sellingPrice,
        discount,
        finalPrice,
        stock: p?.totalStock ?? p?.stock ?? 0,
        imageUrl: getImageUrlFromValue(p?.imageUrl) || getImageUrlFromValue(p?.images?.[0]) || '',
    };
};

const normalizeBootstrapData = (bootstrapData = {}) => {
    const rawProducts = bootstrapData.products || [];
    const rawSectionProducts = bootstrapData.sectionProducts || {};
    const sectionProducts = Object.entries(rawSectionProducts).reduce((acc, [sectionId, items]) => {
        acc[sectionId] = Array.isArray(items) ? items.map(normalizeProduct) : [];
        return acc;
    }, {});

    return {
        shop: bootstrapData.shop || null,
        products: rawProducts.map(normalizeProduct),
        categories: bootstrapData.categories?.filter(Boolean) || [],
        banners: bootstrapData.banners || [],
        sectionProducts,
        sectionReviews: bootstrapData.sectionReviews || {},
        pagination: bootstrapData.pagination || { page: 1, pages: 1, total: 0 },
        loading: false,
        error: null
    };
};

const emptyShopData = {
    shop: null,
    products: [],
    categories: [],
    banners: [],
    sectionProducts: {},
    sectionReviews: {},
    pagination: { page: 1, pages: 1, total: 0 },
    loading: true,
    error: null
};

export const useShopData = (subdomain, filters, initialData = null) => {
    const {
        page = 1,
        sort,
        category,
        minPrice,
        maxPrice,
        minRating
    } = filters;
    const hasInitialData = Boolean(initialData?.shop);
    const hasInitialError = Boolean(initialData?.error && !initialData?.shop);
    const [data, setData] = useState(() => (
        hasInitialData
            ? normalizeBootstrapData(initialData)
            : hasInitialError
                ? { ...emptyShopData, loading: false, error: initialData.error }
                : emptyShopData
    ));
    const hasBootstrappedRef = useRef(hasInitialData);
    const skippedInitialFetchRef = useRef(hasInitialData || hasInitialError);
    const subdomainRef = useRef(subdomain);

    // Use a stringified key to prevent unnecessary fetches if filters haven't actually changed
    useEffect(() => {
        let isMounted = true;
        const subdomainChanged = subdomainRef.current !== subdomain;

        if (subdomainChanged) {
            subdomainRef.current = subdomain;
            hasBootstrappedRef.current = false;
            skippedInitialFetchRef.current = false;
            setData(emptyShopData);
        }

        const params = {
            page,
            limit: 9,
            sort,
            ...(category !== 'All' && { category }),
            ...(minPrice && { minPrice }),
            ...(maxPrice && { maxPrice }),
            ...(minRating && { minRating }),
        };

        const fetchProductsOnly = async () => {
            setData(prev => ({ ...prev, loading: true }));
            try {
                const productsRes = await API.get(`/storefront/${subdomain}/products`, { params });

                if (!isMounted) return;

                const productData = productsRes.data || {};
                const rawProducts = productData.data || productData.products || [];

                setData(prev => ({
                    ...prev,
                    products: rawProducts.map(normalizeProduct),
                    categories: productData.categories?.filter(Boolean) || prev.categories,
                    pagination: productData.pagination || prev.pagination,
                    loading: false,
                    error: null
                }));
            } catch (err) {
                console.error("Storefront Product Fetch Error:", err);
                const errorMessage = err.response?.data?.error || "Unable to load products";
                if (isMounted) setData(prev => ({ ...prev, loading: false, error: errorMessage }));
            }
        };

        const fetchBootstrap = async () => {
            setData(prev => ({ ...prev, loading: true }));
            try {
                const bootstrapRes = await API.get(`/storefront/${subdomain}/bootstrap`, { params });

                if (!isMounted) return;
                hasBootstrappedRef.current = true;

                const bootstrapData = bootstrapRes.data?.data || {};
                setData(normalizeBootstrapData(bootstrapData));
            } catch (err) {
                console.error("Storefront Bootstrap Fetch Error:", err);
                const errorMessage = err.response?.data?.error || "Store not found";
                if (isMounted) setData(prev => ({ ...prev, loading: false, error: errorMessage }));
            }
        };

        if (subdomain) {
            if (skippedInitialFetchRef.current) {
                skippedInitialFetchRef.current = false;
            } else if (hasBootstrappedRef.current) fetchProductsOnly();
            else fetchBootstrap();
        }

        return () => { isMounted = false; };
    }, [subdomain, page, sort, category, minPrice, maxPrice, minRating]);

    return data;
};
