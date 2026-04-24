import { useState, useEffect } from 'react';
import API from '../api/api';

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
                const { data } = await API.get(`/public/shop/${subdomain}${buildQueryString(1)}`);
                setShop(data.shop);
                setProducts(data.products);
                setHasMore(data.hasMore);
                setCategories(data.categories || []);
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
        const nextPage = page + 1;

        try {
            const { data } = await API.get(`/public/shop/${subdomain}${buildQueryString(nextPage)}`);
            setProducts((prevProducts) => {
                const combined = [...prevProducts, ...data.products];
                return Array.from(new Map(combined.map(item => [item._id, item])).values());
            });
            setHasMore(data.hasMore);
            setPage(nextPage);
        } catch (err) {
            console.error("Failed to load more products");
        } finally {
            setLoadingMore(false);
        }
    };

    return { shop, products, categories, loading, error, hasMore, loadingMore, loadMore };
};