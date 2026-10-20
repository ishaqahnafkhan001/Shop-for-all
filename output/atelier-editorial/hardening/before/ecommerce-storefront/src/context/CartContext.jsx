"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const CartContext = createContext();

const getCartItemKey = (item) => `${item._id}:${item.variantId || item.selectedVariant?._id || 'default'}`;

export const CartProvider = ({ children, subdomain }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isMounted, setIsMounted] = useState(false);

    const storageKey = `shopforall_cart_${subdomain}`;

    // Load cart from LocalStorage on first render
    useEffect(() => {
        const savedCart = localStorage.getItem(storageKey);
        queueMicrotask(() => {
            setIsMounted(true);
            if (savedCart) {
                try {
                    setCartItems(JSON.parse(savedCart).map(item => ({
                        ...item,
                        cartItemId: item.cartItemId || getCartItemKey(item)
                    })));
                } catch {
                    console.error("Failed to parse cart data");
                }
            }
        });
    }, [storageKey]);

    // Save cart to LocalStorage whenever it changes
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem(storageKey, JSON.stringify(cartItems));
        }
    }, [cartItems, isMounted, storageKey]);

    // --- CART ACTIONS --- //

    const addToCart = (product, quantity = 1) => {
        const cartItem = {
            ...product,
            variantId: product.variantId || product.selectedVariant?._id,
            quantity,
        };
        cartItem.cartItemId = getCartItemKey(cartItem);
        const isExisting = cartItems.some((item) => item.cartItemId === cartItem.cartItemId);

        if (isExisting) {
            toast.success(`Increased ${product.title} quantity!`);
        } else {
            toast.success(`${product.title} added to cart!`);
        }

        setCartItems((prev) => {
            if (prev.some((item) => item.cartItemId === cartItem.cartItemId)) {
                return prev.map((item) =>
                    item.cartItemId === cartItem.cartItemId
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, cartItem];
        });
    };

    const removeFromCart = (cartItemId) => {
        toast.success("Item removed from cart");
        setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId && item._id !== cartItemId));
    };

    const updateQuantity = (cartItemId, newQuantity) => {
        if (newQuantity < 1) return removeFromCart(cartItemId);

        setCartItems((prev) =>
            prev.map((item) =>
                item.cartItemId === cartItemId || item._id === cartItemId ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    // --- DERIVED STATE (Calculated on the fly) --- //

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    // ✨ THE FIX: Check for finalPrice first, fallback to sellingPrice
    const cartTotal = cartItems.reduce((total, item) => {
        const activePrice = item.cartPrice || item.finalPrice || item.sellingPrice || 0;
        return total + (activePrice * item.quantity);
    }, 0);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                cartCount,
                cartTotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
