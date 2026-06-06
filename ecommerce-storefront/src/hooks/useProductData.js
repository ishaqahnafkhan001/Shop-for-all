import { useState, useEffect, useMemo, useCallback } from 'react';
import API from '@/api/api';
import { normalizeProduct } from '@/utils/normalizeProduct';

/**
 * Encapsulates all data-fetching and derived state for the product detail page.
 * The component stays a pure presentation layer.
 */
export function useProductData(subdomain, id) {
    const [product,         setProduct]         = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [reviews,         setReviews]         = useState([]);
    const [loading,         setLoading]         = useState(true);
    const [error,           setError]           = useState(false);
    const [selectedAttributes, setSelectedAttributes] = useState({});

    /* ---------- helpers ---------- */
    const fetchReviews = useCallback(async () => {
        try {
            const { data } = await API.get(`/storefront/${subdomain}/products/${id}/reviews`);
            setReviews(data.data || []);
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
        }
    }, [subdomain, id]);

    /* ---------- initial load ---------- */
    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        const run = async () => {
            try {
                const { data } = await API.get(`/storefront/${subdomain}/products/${id}`);
                if (cancelled) return;

                const normalized = normalizeProduct(data);
                setProduct(normalized);

                // Pre-select first active variant attributes
                if (normalized.variants?.length > 0) {
                    const first = normalized.variants.find(v => v.isActive && v.status !== 'archived') || normalized.variants[0];
                    const init  = Object.fromEntries(first.attributes.map(a => [a.name, a.value]));
                    setSelectedAttributes(init);
                }

                // Fire reviews + related products in parallel (non-blocking)
                fetchReviews();

                if (normalized.category) {
                    API.get(`/storefront/${subdomain}/products`, { params: { category: normalized.category } })
                        .then(({ data: rel }) => {
                            if (cancelled) return;
                            const all = Array.isArray(rel) ? rel : (rel.products || rel.data || []);
                            setRelatedProducts(
                                all
                                    .filter(p => p.category === normalized.category && p._id !== id)
                                    .map(normalizeProduct)
                                    .slice(0, 5)
                            );
                        })
                        .catch(err => console.error('Failed to fetch related products:', err));
                }
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => { cancelled = true; };
    }, [id, subdomain, fetchReviews]);

    /* ---------- derived: attribute options ---------- */
    const availableAttributes = useMemo(() => {
        if (product?.options?.length > 0) {
            return Object.fromEntries(
                product.options
                    .slice()
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                    .map(option => [
                        option.name,
                        (option.values || [])
                            .slice()
                            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                            .map(value => value.value)
                    ])
            );
        }
        if (!product?.variants) return {};
        const attrs = {};
        product.variants.forEach(variant => {
            if (!variant.isActive || variant.status === 'archived') return;
            variant.attributes.forEach(({ name, value }) => {
                if (!attrs[name]) attrs[name] = new Set();
                attrs[name].add(value);
            });
        });
        return Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, [...v]]));
    }, [product]);

    /* ---------- derived: matched variant ---------- */
    const currentVariant = useMemo(() => {
        if (!product?.variants?.length) return null;
        return product.variants.find(variant =>
            variant.isActive !== false &&
            variant.status !== 'archived' &&
            variant.attributes.every(attr => selectedAttributes[attr.name] === attr.value)
        ) ?? null;
    }, [product, selectedAttributes]);

    /* ---------- derived: display pricing / stock ---------- */
    const displayStock      = currentVariant
        ? (currentVariant.inventory?.stock ?? currentVariant.stock ?? 0)
        : (product?.stock ?? 0);
    const baseOriginalPrice = currentVariant?.pricing?.price ?? currentVariant?.priceOverride ?? product?.sellingPrice ?? 0;
    const displayDiscount   = product?.discount ?? 0;
    const displayFinalPrice = displayDiscount > 0
        ? Math.round(baseOriginalPrice - (baseOriginalPrice * displayDiscount) / 100)
        : baseOriginalPrice;

    /* ---------- actions ---------- */
    const handleAttributeSelect = useCallback((name, value) => {
        setSelectedAttributes(prev => ({ ...prev, [name]: value }));
    }, []);

    /* ---------- review update helper (called by ReviewSection) ---------- */
    const refreshProductStats = useCallback(async () => {
        try {
            const { data } = await API.get(`/storefront/${subdomain}/products/${id}`);
            setProduct(prev => ({
                ...prev,
                averageRating: data.averageRating || prev.averageRating,
                numReviews   : data.numReviews    || prev.numReviews,
            }));
        } catch { /* silent */ }
        fetchReviews();
    }, [subdomain, id, fetchReviews]);

    return {
        product,
        relatedProducts,
        reviews,
        loading,
        error,
        selectedAttributes,
        availableAttributes,
        currentVariant,
        displayStock,
        baseOriginalPrice,
        displayDiscount,
        displayFinalPrice,
        handleAttributeSelect,
        refreshProductStats,
    };
}
