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
    const filterKey = JSON.stringify(filters);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            setData(prev => ({ ...prev, loading: true }));
            try {
                const params = {
                    page: filters.page || 1,
                    limit: 9,
                    sort: filters.sort,
                    ...(filters.category !== 'All' && { category: filters.category }),
                    ...(filters.minPrice && { minPrice: filters.minPrice }),
                    ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
                };

                // ✨ 2. Fetch Shop, Products, and Banners concurrently
                const [shopRes, prodRes, bannersRes] = await Promise.all([
                    API.get(`/storefront/${subdomain}/info`),
                    API.get(`/storefront/${subdomain}/products`, { params }),
                    // 🛡️ Safe fallback: If banners fail, return empty array so it doesn't break the whole store
                    API.get(`/banners/storefront/${subdomain}/active`).catch(() => ({ data: [] }))
                ]);

                if (!isMounted) return;

                const prodData = prodRes.data;
                const rawProducts = prodData?.products || prodData?.data || [];

                // ✨ 3. Safely extract banner data
                const bannerData = Array.isArray(bannersRes.data)
                    ? bannersRes.data
                    : bannersRes.data?.data || [];

                setData({
                    shop: shopRes.data,
                    products: rawProducts.map(normalizeProduct),
                    categories: prodData?.categories?.filter(Boolean) || [],
                    banners: bannerData, // ✨ 4. Populate banners in state
                    pagination: prodData?.pagination || { page: 1, pages: 1 },
                    loading: false,
                    error: null
                });
            } catch (err) {
                console.error("Storefront Fetch Error:", err);
                if (isMounted) setData(prev => ({ ...prev, loading: false, error: "Store not found" }));
            }
        };

        if (subdomain) fetchData();

        return () => { isMounted = false; };
    }, [subdomain, filterKey]);

    return data; // Returns { shop, products, categories, banners, pagination, loading, error }
};