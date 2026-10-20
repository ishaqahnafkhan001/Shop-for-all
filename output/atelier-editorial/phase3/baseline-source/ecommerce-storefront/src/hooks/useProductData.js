import { getInitialAttributes, getProductPresentation } from '@scaleup/storefront-renderer/product-data';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import API from '@/api/api';
import { normalizeProduct } from '@/utils/normalizeProduct';



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
                        .filter(p => p.category === normalized.category && p._id !== normalized._id)
                        .map(normalizeProduct)
                        .slice(0, 5)
                );
            })
            .catch(err => console.error('Failed to fetch related products:', err));
    }, [subdomain]);

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

    const { availableAttributes, currentVariant, displayStock, baseOriginalPrice, displayFinalPrice, displayDiscount } = useMemo(
        () => getProductPresentation(product, selectedAttributes), [product, selectedAttributes]);

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
