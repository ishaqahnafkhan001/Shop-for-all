import { useState, useEffect } from 'react';
import API from '../api/api';

const normalizeProduct = (product) => {
    const sellingPrice = product?.pricing?.sellingPrice ?? product?.sellingPrice ?? 0;
    const discount = product?.pricing?.discount ?? product?.discount ?? 0;
    const finalPrice = product?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * discount) / 100);
    const stock = product?.totalStock ?? product?.stock ?? (Array.isArray(product?.variants)
        ? product.variants.reduce((sum, variant) => sum + (variant?.stock || 0), 0)
        : 0);

    return {
        ...product,
        sellingPrice,
        discount,
        finalPrice,
        stock,
        imageUrl: product?.imageUrl || product?.images?.[0] || null,
    };
};

export const useShopData = (subdomain, filters = {}) => {
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const buildQueryString = (pageToFetch) => {
        let q = `?page=${pageToFetch}&limit=16`;
        if (filters.category && filters.category !== 'All') q += `&category=${encodeURIComponent(filters.category)}`;
        if (filters.minPrice) q += `&minPrice=${filters.minPrice}`;
        if (filters.maxPrice) q += `&maxPrice=${filters.maxPrice}`;
        // ✨ NEW: Add sort to the URL
        if (filters.sort) q += `&sort=${filters.sort}`;
        return q;
    };

    useEffect(() => {
        const getInitialData = async () => {
            setLoading(true);
            try {
                const [shopRes, productsRes] = await Promise.all([
                    API.get(`/storefront/${subdomain}/info`),
                    API.get(`/storefront/${subdomain}/products${buildQueryString(1)}`),
                ]);

                const normalizedProducts = (productsRes.data?.products || []).map(normalizeProduct);
                const derivedCategories = Array.from(new Set(normalizedProducts.map((item) => item.category).filter(Boolean)));

                setShop(shopRes.data || null);
                setProducts(normalizedProducts);
                setHasMore(false);
                setCategories(derivedCategories);
                setPage(1);
            } catch (err) {
                setError("Shop not found");
            } finally {
                setLoading(false);
            }
        };

        if (subdomain) getInitialData();
        // ✨ NEW: Tell useEffect to re-run whenever 'sort' changes
    }, [subdomain, filters.category, filters.minPrice, filters.maxPrice, filters.sort]);

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            setHasMore(false);
        } catch (err) {
            console.error("Failed to load more products");
        } finally {
            setLoadingMore(false);
        }
    };

    return { shop, products, categories, loading, error, hasMore, loadingMore, loadMore };
};