"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import API from "@/api/api";
import StorefrontVariantPickerModal from "@/components/storefront/StorefrontVariantPickerModal";
import { useCart } from "@/context/CartContext";
import { normalizeProduct } from "@/utils/normalizeProduct";

const getProductId = (product = {}) => String(product._id || product.id || "");
const getWishlistKey = (subdomain) => `wishlist:${subdomain || "store"}`;

const parseWishlist = (raw) => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : parsed?.items;
        return Array.isArray(items) ? items.filter((item) => item?.id) : [];
    } catch {
        return [];
    }
};

const summarizeWishlistProduct = (product = {}) => ({
    id: getProductId(product),
    title: product.title || "",
    slug: product.slug || "",
    imageUrl: product.coverMediaId || product.imageUrl || product.images?.[0] || "",
    addedAt: new Date().toISOString(),
});

const getVariantStock = (variant = {}) => Number(variant.stock ?? variant.inventory?.stock ?? 0);

const getAvailableVariants = (product = {}) => (
    (product.variants || []).filter((variant) => variant?.isActive !== false && variant?.status !== "archived")
);

const buildCartProduct = (product, selectedVariant = null) => {
    const normalized = normalizeProduct(product) || product;
    const variant = selectedVariant || normalized.selectedVariant || null;
    const variantPrice = variant?.pricing?.price ?? variant?.priceOverride;
    const basePrice = Number.isFinite(Number(variantPrice))
        ? Number(variantPrice)
        : Number(normalized.sellingPrice || normalized.pricing?.sellingPrice || 0);
    const discount = Number(normalized.discount ?? normalized.pricing?.discount ?? 0);
    const finalPrice = Math.round(basePrice - ((basePrice * discount) / 100));

    return {
        ...normalized,
        selectedVariant: variant || normalized.selectedVariant,
        variantId: variant?._id || normalized.variantId || normalized.selectedVariant?._id,
        stock: variant ? getVariantStock(variant) : normalized.stock,
        sellingPrice: basePrice || normalized.sellingPrice,
        finalPrice: Number.isFinite(finalPrice) ? finalPrice : normalized.finalPrice,
        cartPrice: Number.isFinite(finalPrice) ? finalPrice : normalized.finalPrice,
        imageUrl: variant?.image || normalized.coverMediaId || normalized.imageUrl || normalized.images?.[0] || "",
    };
};

export function useStorefrontProductActions({
    subdomain,
    onProductAdded,
} = {}) {
    const router = useRouter();
    const { addToCart } = useCart();
    const [wishlistItems, setWishlistItems] = useState([]);
    const [variantPickerProduct, setVariantPickerProduct] = useState(null);
    const [variantPickerLoading, setVariantPickerLoading] = useState(false);

    const wishlistKey = useMemo(() => getWishlistKey(subdomain), [subdomain]);
    const wishlistIds = useMemo(() => new Set(wishlistItems.map((item) => String(item.id))), [wishlistItems]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        queueMicrotask(() => {
            setWishlistItems(parseWishlist(window.localStorage.getItem(wishlistKey)));
        });
    }, [wishlistKey]);

    const persistWishlist = useCallback((items) => {
        setWishlistItems(items);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(wishlistKey, JSON.stringify({ items }));
        }
    }, [wishlistKey]);

    const isWishlisted = useCallback((product) => wishlistIds.has(getProductId(product)), [wishlistIds]);

    const toggleWishlist = useCallback((product) => {
        const productId = getProductId(product);
        if (!productId) return;

        const alreadySaved = wishlistIds.has(productId);
        const nextItems = alreadySaved
            ? wishlistItems.filter((item) => String(item.id) !== productId)
            : [summarizeWishlistProduct(product), ...wishlistItems.filter((item) => String(item.id) !== productId)].slice(0, 100);

        persistWishlist(nextItems);
        toast.success(alreadySaved ? "Removed from wishlist" : "Added to wishlist");
    }, [persistWishlist, wishlistIds, wishlistItems]);

    const addProductToCart = useCallback((product, options = {}) => {
        const cartProduct = buildCartProduct(product, options.selectedVariant);
        addToCart(cartProduct, options.quantity || 1);
        onProductAdded?.(cartProduct, {
            location: options.location || "product_card",
            intent: options.intent || "add_to_cart",
        });
        return cartProduct;
    }, [addToCart, onProductAdded]);

    const goToCheckout = useCallback(() => {
        router.push("/checkout");
    }, [router]);

    const buyNow = useCallback(async (product, options = {}) => {
        const normalizedProduct = normalizeProduct(product) || product;
        const stock = Number(normalizedProduct.stock ?? normalizedProduct.totalStock ?? 0);
        if (stock <= 0) {
            toast.error("This product is out of stock");
            return;
        }

        const activeVariants = getAvailableVariants(normalizedProduct);
        const hasVariantChoices = Number(normalizedProduct.variantCount || activeVariants.length || 0) > 1 && !normalizedProduct.selectedVariant;

        const expectedVariantCount = Number(normalizedProduct.variantCount || activeVariants.length || 0);
        const shouldLoadFullVariantSet = hasVariantChoices && (
            activeVariants.length <= 1 ||
            expectedVariantCount > activeVariants.length ||
            !normalizedProduct.variantsLoaded
        );

        if (shouldLoadFullVariantSet) {
            setVariantPickerLoading(true);
            try {
                const productKey = normalizedProduct.slug || normalizedProduct._id;
                const { data } = await API.get(`/storefront/${subdomain}/products/${productKey}`);
                const detailedProduct = normalizeProduct(data?.data || data);
                const detailedVariants = getAvailableVariants(detailedProduct);

                if (detailedVariants.length > 1) {
                    setVariantPickerProduct(detailedProduct);
                    return;
                }

                const selectedVariant = detailedVariants[0] || null;
                addProductToCart(detailedProduct, {
                    selectedVariant,
                    location: options.location || "product_card",
                    intent: "buy_now",
                });
                goToCheckout();
            } catch (error) {
                toast.error(error.response?.data?.error || "Could not load product options");
            } finally {
                setVariantPickerLoading(false);
            }
            return;
        }

        if (hasVariantChoices) {
            setVariantPickerProduct(normalizedProduct);
            return;
        }

        const selectedVariant = activeVariants.length === 1 ? activeVariants[0] : normalizedProduct.selectedVariant;
        addProductToCart(normalizedProduct, {
            selectedVariant,
            location: options.location || "product_card",
            intent: "buy_now",
        });
        goToCheckout();
    }, [addProductToCart, goToCheckout, subdomain]);

    const handleVariantBuyNow = useCallback((variant) => {
        if (!variantPickerProduct) return;
        if (getVariantStock(variant) <= 0) {
            toast.error("This option is out of stock");
            return;
        }

        addProductToCart(variantPickerProduct, {
            selectedVariant: variant,
            location: "variant_picker",
            intent: "buy_now",
        });
        setVariantPickerProduct(null);
        goToCheckout();
    }, [addProductToCart, goToCheckout, variantPickerProduct]);

    const variantPicker = (
        <StorefrontVariantPickerModal
            open={Boolean(variantPickerProduct) || variantPickerLoading}
            product={variantPickerProduct}
            loading={variantPickerLoading}
            onClose={() => {
                if (!variantPickerLoading) setVariantPickerProduct(null);
            }}
            onSelectVariant={handleVariantBuyNow}
        />
    );

    return {
        addProductToCart,
        buyNow,
        isWishlisted,
        toggleWishlist,
        variantPicker,
    };
}
