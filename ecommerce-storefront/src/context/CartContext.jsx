"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    // ✨ NEW: We need a flag to track if we've loaded the saved cart yet
    const [isLoaded, setIsLoaded] = useState(false);

    // ✨ NEW STEP 1: Load the cart from Local Storage when the app starts
    useEffect(() => {
        const savedCart = localStorage.getItem('shopforall_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error("Failed to load cart from storage", error);
            }
        }
        setIsLoaded(true); // Tell the app we are done loading
    }, []);

    // ✨ NEW STEP 2: Save the cart to Local Storage EVERY TIME it changes
    useEffect(() => {
        // We only save if isLoaded is true.
        // Otherwise, we might accidentally overwrite their saved cart with an empty array on the first millisecond!
        if (isLoaded) {
            localStorage.setItem('shopforall_cart', JSON.stringify(cart));
        }
    }, [cart, isLoaded]);

    const addToCart = (product) => {
        const existingItem = cart.find(item => item._id === product._id);

        if (existingItem) {
            toast.success(`Increased quantity for ${product.title}`);
            setCart((prevCart) =>
                prevCart.map(item =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                )
            );
        } else {
            toast.success(`${product.title} added to cart`);
            setCart((prevCart) => [...prevCart, { ...product, quantity: 1 }]);
        }
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        setCart((prevCart) =>
            prevCart.map(item =>
                item._id === productId ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const removeFromCart = (productId) => {
        setCart((prevCart) => prevCart.filter(item => item._id !== productId));
        toast.error("Item removed from cart", {
            style: { background: '#ef4444', color: '#fff' }
        });
    };

    const clearCart = () => setCart([]);

    return (
        <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart }}>
            {/* ✨ We only show the children once localStorage has finished loading. This prevents a weird "flicker" */}
            {isLoaded ? children : null}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);