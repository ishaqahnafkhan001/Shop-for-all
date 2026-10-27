import { useState } from 'react';

export const previewPages = [
    { id: 'home', label: 'Home' },
    { id: 'product', label: 'Product' },
    { id: 'cart', label: 'Cart' },
    { id: 'checkout', label: 'Checkout' },
    { id: 'policy', label: 'Policy' }
];

export const usePreviewMode = (initialDevice, initialPage = 'home') => {
    const [device, setDevice] = useState(() => initialDevice || (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'smallMobile' : 'desktop'));
    const [previewPage, setPreviewPage] = useState(initialPage);

    return {
        device,
        setDevice,
        previewPage,
        setPreviewPage
    };
};
