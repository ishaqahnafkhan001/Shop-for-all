"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import API from '@/api/api';
import { useCart } from '@/context/CartContext';
import SearchModal from '@/components/search/SearchModal';
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider';
import { ReferenceStorefrontHeader } from './ReferenceStorefront';

const normalizeSearchProduct = (p) => {
    const sellingPrice = p?.pricing?.sellingPrice ?? p?.sellingPrice ?? 0;
    const discount = p?.pricing?.discount ?? p?.discount ?? 0;
    const finalPrice = p?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * (discount / 100)));

    return {
        ...p,
        sellingPrice,
        discount,
        finalPrice,
        imageUrl: p?.imageUrl || p?.images?.[0] || '',
    };
};

export default function Navbar({ subdomain }) {
    const { cartCount } = useCart();
    const { settings: shopSettings, theme } = useStorefrontTheme();
    const [searchOpen, setSearchOpen] = useState(false);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchSearchProducts = async () => {
            try {
                const productsRes = await API.get(`/storefront/${subdomain}/products`, {
                    params: { limit: 12 }
                });
                const rawProducts = productsRes.data?.products || productsRes.data?.data || [];
                setProducts(rawProducts.map(normalizeSearchProduct));
            } catch (err) {
                console.error("Search products fetch failed:", err);
            }
        };

        if (searchOpen && subdomain && products.length === 0) fetchSearchProducts();
    }, [searchOpen, subdomain, products.length]);

    return (
        <>
            <ReferenceStorefrontHeader
                theme={theme}
                shopName={shopSettings?.shopName}
                subdomain={subdomain}
                trustedBadge={shopSettings?.trustedBadge}
                cartCount={cartCount}
                onSearch={() => setSearchOpen(true)}
                LinkComponent={Link}
            />
            <SearchModal
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                products={products}
            />
        </>
    );
}
