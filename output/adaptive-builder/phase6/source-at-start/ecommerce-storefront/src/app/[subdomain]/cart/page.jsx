"use client";
import React from 'react';
import {getStorefrontPresentationVariant} from '@scaleup/storefront-theme';
import { useCart } from '@/context/CartContext';
import { useParams } from 'next/navigation';
import API from '@/api/api';
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider';
import { useStorefrontProductActions } from '@/hooks/useStorefrontProductActions';
import { DEFAULT_CART_DELIVERY_ESTIMATE } from '@/lib/cartConstants';
import { normalizeProduct } from '@/utils/normalizeProduct';
import { getCartItemPrice, getCartItemOriginalPrice } from '@scaleup/storefront-renderer/product-data';

import { CartView } from '@scaleup/storefront-renderer/presentation/CartView';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';

export default function CartPage() {
    const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();
    const params = useParams();
    const subdomain = params?.subdomain;
    const { theme } = useStorefrontTheme();
    const productCardColors = theme?.colors?.productCard;
    const productActions = useStorefrontProductActions({ subdomain });
    const [promoCode, setPromoCode] = React.useState('');
    const [promoFeedback, setPromoFeedback] = React.useState(null);
    const [recommendations, setRecommendations] = React.useState([]);
    const [recommendationsLoading, setRecommendationsLoading] = React.useState(false);

    const subtotal = cartTotal;
    const shipping = cartItems.length > 0 ? DEFAULT_CART_DELIVERY_ESTIMATE : 0;
    const recommendationIds = React.useMemo(() => (
        [...new Set(cartItems.map((item) => item._id).filter(Boolean))]
    ), [cartItems]);
    const themedProductCard = React.useMemo(() => ({
        ...(theme?.productCard || {}),
        colors: productCardColors || {},
    }), [theme?.productCard, productCardColors]);

    // Calculate total savings based on your Product Schema pricing logic
    const totalSavings = cartItems.reduce((acc, item) => {
        const original = getCartItemOriginalPrice(item);
        const current = getCartItemPrice(item);
        const saving = original > current ? (original - current) * item.quantity : 0;
        return acc + saving;
    }, 0);

    const total = subtotal + shipping;
    const getCartImageUrl = (item) => item.imageUrl || item.images?.[0] || '';

    React.useEffect(() => {
        if (!subdomain || recommendationIds.length === 0) {
            queueMicrotask(() => {
                setRecommendations([]);
            });
            return undefined;
        }

        let ignore = false;
        queueMicrotask(() => {
            if (!ignore) setRecommendationsLoading(true);
        });
        API.get(`/storefront/${subdomain}/recommendations/cart`, {
            params: {
                ids: recommendationIds.join(','),
                limit: 6,
            },
        })
            .then(({ data }) => {
                if (ignore) return;
                setRecommendations((data?.data || []).map(normalizeProduct).filter(Boolean));
            })
            .catch(() => {
                if (!ignore) setRecommendations([]);
            })
            .finally(() => {
                if (!ignore) setRecommendationsLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [recommendationIds, subdomain]);

    const handleApplyPromo = () => {
        const code = promoCode.trim().toUpperCase();
        if (!code) {
            setPromoFeedback({ type: 'error', text: 'Enter a coupon code first.' });
            return;
        }
        sessionStorage.setItem('shopforall_pending_promo', code);
        setPromoCode(code);
        setPromoFeedback({ type: 'success', text: 'Coupon saved. It will be validated during checkout.' });
    };

    return <StorefrontPresentationRuntime><CartView {...{
        presentationVariant: getStorefrontPresentationVariant(theme),
        cartItems, removeFromCart, updateQuantity, subtotal, shipping, totalSavings, total, getCartImageUrl,
        promoCode, setPromoCode, promoFeedback, handleApplyPromo, recommendationsLoading, recommendations,
        themedProductCard, productActions,
    }} /></StorefrontPresentationRuntime>;
}
