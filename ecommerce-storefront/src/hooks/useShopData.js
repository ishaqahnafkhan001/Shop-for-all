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
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const buildParams = () => {
        const params = {
            page: filters.page || 1,
            limit: 9, // You can set this back to 9 or whatever grid size you want
        };

        if (filters.category && filters.category !== 'All') params.category = filters.category;
        if (filters.minPrice) params.minPrice = filters.minPrice;
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        if (filters.sort) params.sort = filters.sort;

        return params;
    };

    useEffect(() => {
        const fetchShopData = async () => {
            setLoading(true);
            try {
                const shopPromise = shop
                    ? Promise.resolve({ data: shop })
                    : API.get(`/storefront/${subdomain}/info`);

                const [shopRes, productsRes] = await Promise.all([
                    shopPromise,
                    API.get(`/storefront/${subdomain}/products`, { params: buildParams() }),
                ]);

                const rawProducts = productsRes.data?.data || productsRes.data?.products || [];
                const normalizedProducts = rawProducts.map(normalizeProduct);

                setShop(shopRes.data || shop);
                setProducts(normalizedProducts);

                if (productsRes.data?.pagination) {
                    setPagination(productsRes.data.pagination);
                }

                // ✨ THE FIX: Use the actual categories sent from the backend
                if (productsRes.data?.categories) {
                    // Filter out any null/empty strings just in case bad data exists in the DB
                    const cleanCategories = productsRes.data.categories.filter(Boolean);
                    setCategories(cleanCategories);
                }

            } catch (err) {
                setError("Shop not found");
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (subdomain) fetchShopData();
    }, [subdomain, filters.category, filters.minPrice, filters.maxPrice, filters.sort, filters.page]);

    return { shop, products, categories, loading, error, pagination };
};