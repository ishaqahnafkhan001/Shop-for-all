"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children, subdomain }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isMounted, setIsMounted] = useState(false);

    const storageKey = `shopforall_cart_${subdomain}`;

    // Load cart from LocalStorage on first render
    useEffect(() => {
        setIsMounted(true);
        const savedCart = localStorage.getItem(storageKey);
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart data");
            }
        }
    }, [storageKey]);

    // Save cart to LocalStorage whenever it changes
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem(storageKey, JSON.stringify(cartItems));
        }
    }, [cartItems, isMounted, storageKey]);

    // --- CART ACTIONS --- //

    const addToCart = (product, quantity = 1) => {
        // ✨ THE FIX: We trigger the Toast notifications OUTSIDE the state updater
        const isExisting = cartItems.some((item) => item._id === product._id);

        if (isExisting) {
            toast.success(`Increased ${product.title} quantity!`);
        } else {
            toast.success(`${product.title} added to cart!`);
        }

        // ✨ We do the actual state update purely, with no side effects inside
        setCartItems((prev) => {
            if (prev.some((item) => item._id === product._id)) {
                return prev.map((item) =>
                    item._id === product._id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity }];
        });
    };

    const removeFromCart = (productId) => {
        // Toasts are safe here because they aren't inside the setCartItems function
        toast.success("Item removed from cart");
        setCartItems((prev) => prev.filter((item) => item._id !== productId));
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return removeFromCart(productId);

        setCartItems((prev) =>
            prev.map((item) =>
                item._id === productId ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    // --- DERIVED STATE (Calculated on the fly) --- //

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cartItems.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);

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