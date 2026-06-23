import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import API from '@/api/api';
import { normalizeProduct } from '@/utils/normalizeProduct';

const getInitialAttributes = (product) => {
    if (!product?.variants?.length) return {};
    const first = product.variants.find(v => v.isActive && v.status !== 'archived') || product.variants[0];
    return Object.fromEntries((first.attributes || []).map(a => [a.name, a.value]));
};

/**
 * Encapsulates all data-fetching and derived state for the product detail page.
 * The component stays a pure presentation layer.
 */
export function useProductData(subdomain, id, initialProduct = null) {
    const normalizedInitialProduct = useMemo(() => normalizeProduct(initialProduct), [initialProduct]);
    const hasInitialProduct = Boolean(normalizedInitialProduct?._id);
    const initialProductUsedRef = useRef(false);
    const [product,         setProduct]         = useState(normalizedInitialProduct);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [reviews,         setReviews]         = useState([]);
    const [loading,         setLoading]         = useState(!hasInitialProduct);
    const [error,           setError]           = useState(false);
    const [selectedAttributes, setSelectedAttributes] = useState(() => getInitialAttributes(normalizedInitialProduct));

    /* ---------- helpers ---------- */
    const fetchReviews = useCallback(async () => {
        try {
            const { data } = await API.get(`/storefront/${subdomain}/products/${id}/reviews`);
            setReviews(data.data || []);
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
        }
    }, [subdomain, id]);

    const fetchRelatedProducts = useCallback((normalized, cancelledRef) => {
        if (!normalized?.category) return;

        API.get(`/storefront/${subdomain}/products`, { params: { category: normalized.category } })
            .then(({ data: rel }) => {
                if (cancelledRef.cancelled) return;
                const all = Array.isArray(rel) ? rel : (rel.products || rel.data || []);
                setRelatedProducts(
                    all
                        .filter(p => p.category === normalized.category && p._id !== id)
                        .map(normalizeProduct)
                        .slice(0, 5)
                );
            })
            .catch(err => console.error('Failed to fetch related products:', err));
    }, [id, subdomain]);

    /* ---------- initial load ---------- */
    useEffect(() => {
        if (!id) return;

        const cancelledRef = { cancelled: false };

        if (hasInitialProduct && !initialProductUsedRef.current) {
            initialProductUsedRef.current = true;
            setProduct(normalizedInitialProduct);
            setSelectedAttributes(getInitialAttributes(normalizedInitialProduct));
            setLoading(false);
            fetchReviews();
            fetchRelatedProducts(normalizedInitialProduct, cancelledRef);
            return () => { cancelledRef.cancelled = true; };
        }

        const run = async () => {
            try {
                const { data } = await API.get(`/storefront/${subdomain}/products/${id}`);
                if (cancelledRef.cancelled) return;

                const normalized = normalizeProduct(data);
                setProduct(normalized);

                // Pre-select first active variant attributes
                setSelectedAttributes(getInitialAttributes(normalized));

                // Fire reviews + related products in parallel (non-blocking)
                fetchReviews();
                fetchRelatedProducts(normalized, cancelledRef);
            } catch {
                if (!cancelledRef.cancelled) setError(true);
            } finally {
                if (!cancelledRef.cancelled) setLoading(false);
            }
        };

        run();
        return () => { cancelledRef.cancelled = true; };
    }, [fetchRelatedProducts, fetchReviews, hasInitialProduct, id, normalizedInitialProduct, subdomain]);

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
