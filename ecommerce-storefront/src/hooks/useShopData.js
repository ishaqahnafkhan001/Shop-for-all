import { useState, useEffect } from 'react';
import API from '../api/api';

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
        imageUrl: p?.imageUrl || p?.images?.[0] || 'https://via.placeholder.com/400',
    };
};

export const useShopData = (subdomain, filters) => {
    const {
        page = 1,
        sort,
        category,
        minPrice,
        maxPrice
    } = filters;
    const [data, setData] = useState({
        shop: null,
        products: [],
        categories: [],
        banners: [], // ✨ 1. Added banners to the initial state
        pagination: { page: 1, pages: 1, total: 0 },
        loading: true,
        error: null
    });

    // Use a stringified key to prevent unnecessary fetches if filters haven't actually changed
    useEffect(() => {
        let isMounted = true;

        const fetchBootstrap = async () => {
            setData(prev => ({ ...prev, loading: true }));
            try {
                const params = {
                    page,
                    limit: 9,
                    sort,
                    ...(category !== 'All' && { category }),
                    ...(minPrice && { minPrice }),
                    ...(maxPrice && { maxPrice }),
                };

                const bootstrapRes = await API.get(`/storefront/${subdomain}/bootstrap`, { params });

                if (!isMounted) return;

                const bootstrapData = bootstrapRes.data?.data || {};
                const rawProducts = bootstrapData.products || [];

                setData(prev => ({
                    ...prev,
                    shop: bootstrapData.shop || null,
                    banners: bootstrapData.banners || [],
                    products: rawProducts.map(normalizeProduct),
                    categories: bootstrapData.categories?.filter(Boolean) || [],
                    pagination: bootstrapData.pagination || { page: 1, pages: 1 },
                    loading: false,
                    error: null
                }));
            } catch (err) {
                console.error("Storefront Bootstrap Fetch Error:", err);
                if (isMounted) setData(prev => ({ ...prev, loading: false, error: "Store not found" }));
            }
        };

        if (subdomain) fetchBootstrap();

        return () => { isMounted = false; };
    }, [subdomain, page, sort, category, minPrice, maxPrice]);

    return data; // Returns { shop, products, categories, banners, pagination, loading, error }
};
