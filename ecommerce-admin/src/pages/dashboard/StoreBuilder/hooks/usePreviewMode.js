import { useState } from 'react';

export const previewPages = [
    { id: 'home', label: 'Home' },
    { id: 'product', label: 'Product' },
    { id: 'cart', label: 'Cart' },
    { id: 'checkout', label: 'Checkout' },
    { id: 'policy', label: 'Policy' }
];

export const usePreviewMode = (initialDevice = 'desktop', initialPage = 'home') => {
    const [device, setDevice] = useState(initialDevice);
    const [previewPage, setPreviewPage] = useState(initialPage);

    return {
        device,
        setDevice,
        previewPage,
        setPreviewPage
    };
};
