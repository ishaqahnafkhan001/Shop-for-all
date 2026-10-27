"use client";

import AdaptivePresentation from '@/components/storefront/AdaptivePresentation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider';
import { ReferenceStorefrontFooter } from './ReferenceStorefront';

export default function StorefrontFooter({ subdomain }) {
    const { cartCount } = useCart();
    const { theme, settings } = useStorefrontTheme();

    return (
        <AdaptivePresentation pageKind="footer" core><ReferenceStorefrontFooter
            theme={theme}
            shopName={settings?.shopName}
            subdomain={subdomain}
            cartCount={cartCount}
            shopVerification={settings?.shopVerification}
            LinkComponent={Link}
        /></AdaptivePresentation>
    );
}
