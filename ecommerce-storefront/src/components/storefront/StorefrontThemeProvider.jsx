"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import API from '@/api/api';
import { FALLBACK_THEME, getThemeCssVars, normalizeTheme } from '@/lib/theme';

const StorefrontThemeContext = createContext({
    settings: null,
    theme: FALLBACK_THEME,
    cssTheme: getThemeCssVars(FALLBACK_THEME),
    hydrateThemeSettings: () => {},
});

export const useStorefrontTheme = () => useContext(StorefrontThemeContext);

export default function StorefrontThemeProvider({ subdomain, children }) {
    const pathname = usePathname();
    const [settings, setSettings] = useState(null);
    const isTenantHomepage = Boolean(subdomain) && (pathname === '/' || pathname === '');

    const hydrateThemeSettings = useCallback((nextSettings) => {
        if (!nextSettings) return;
        setSettings(nextSettings);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadTheme = async () => {
            if (!subdomain) {
                setSettings(null);
                return;
            }

            if (isTenantHomepage) return;

            try {
                const response = await API.get(`/store-builder/storefront/${subdomain}`);
                if (isMounted) setSettings(response.data?.data || null);
            } catch (error) {
                if (isMounted) setSettings(null);
            }
        };

        loadTheme();

        return () => {
            isMounted = false;
        };
    }, [isTenantHomepage, subdomain]);

    const theme = useMemo(() => normalizeTheme(settings?.theme || {}), [settings?.theme]);
    const cssTheme = useMemo(() => getThemeCssVars(theme), [theme]);

    const style = useMemo(() => {
        const groups = cssTheme.colorGroups || {};
        const brand = groups.brand || {};
        const header = groups.header || {};
        const productCard = groups.productCard || {};
        const footer = groups.footer || {};
        const checkout = groups.checkout || {};

        return {
            '--sf-accent': brand.accent || cssTheme.accent,
            '--sf-accent-hover': brand.hover || cssTheme.accentHover,
            '--sf-accent-soft': brand.soft || cssTheme.accentSoft,
            '--sf-accent-bg': brand.soft || cssTheme.accentBg,
            '--sf-accent-strong': cssTheme.accentStrong,
            '--sf-accent-muted': cssTheme.accentMuted,
            '--sf-accent-light': cssTheme.accentLight,
            '--sf-accent-ring': brand.ring || cssTheme.accentRing,
            '--sf-background': cssTheme.background,
            '--sf-foreground': cssTheme.foreground,
            '--sf-header-background': header.background || cssTheme.headerBackground,
            '--sf-primary-button-bg': cssTheme.primaryButtonBg,
            '--sf-primary-button-text': cssTheme.primaryButtonText,
            '--sf-primary-button-hover-bg': cssTheme.primaryButtonHoverBg,
            '--sf-secondary-button-bg': cssTheme.secondaryButtonBg,
            '--sf-secondary-button-text': cssTheme.secondaryButtonText,
            '--sf-secondary-button-hover-bg': cssTheme.secondaryButtonHoverBg,
            '--sf-navbar-bg': header.background || cssTheme.navbarBackground,
            '--sf-navbar-background': header.background || cssTheme.navbarBackground,
            '--sf-navbar-text': header.text || cssTheme.navbarText,
            '--sf-navbar-hover': header.hover || cssTheme.navbarHover,
            '--sf-card-bg': productCard.background || cssTheme.cardBackground,
            '--sf-card-background': productCard.background || cssTheme.cardBackground,
            '--sf-card-border': productCard.border || cssTheme.cardBorder,
            '--sf-card-hover-border': cssTheme.cardHoverBorder,
            '--sf-product-card-background': productCard.background || cssTheme.cardBackground,
            '--sf-product-card-border': productCard.border || cssTheme.cardBorder,
            '--sf-product-card-title': productCard.title || cssTheme.foreground,
            '--sf-product-card-category': productCard.category || cssTheme.footerText,
            '--sf-product-card-price': productCard.price || cssTheme.priceColor,
            '--sf-product-card-compare-at-price': productCard.compareAtPrice || '#94a3b8',
            '--sf-product-card-sale-badge-bg': productCard.saleBadgeBackground || cssTheme.saleBadgeBg,
            '--sf-product-card-sale-badge-text': productCard.saleBadgeText || cssTheme.saleBadgeText,
            '--sf-product-card-rating-star': productCard.ratingStar || cssTheme.ratingColor,
            '--sf-product-card-rating-text': productCard.ratingText || '#94a3b8',
            '--sf-product-card-wishlist-icon': productCard.wishlistIcon || '#64748b',
            '--sf-product-card-wishlist-active': productCard.wishlistActive || '#e11d48',
            '--sf-product-card-add-to-cart-bg': productCard.addToCartBackground || brand.primary || cssTheme.accent,
            '--sf-product-card-add-to-cart-text': productCard.addToCartText || '#ffffff',
            '--sf-product-card-buy-now-bg': productCard.buyNowBackground || '#0f172a',
            '--sf-product-card-buy-now-text': productCard.buyNowText || '#ffffff',
            '--sf-product-card-out-of-stock-bg': productCard.outOfStockBackground || '#fff1f2',
            '--sf-product-card-out-of-stock-text': productCard.outOfStockText || '#e11d48',
            '--sf-product-card-stock-bg': productCard.stockBackground || '#ecfdf5',
            '--sf-product-card-stock-text': productCard.stockText || '#047857',
            '--sf-price-color': productCard.price || cssTheme.priceColor,
            '--sf-sale-badge-bg': productCard.saleBadgeBackground || cssTheme.saleBadgeBg,
            '--sf-sale-badge-text': productCard.saleBadgeText || cssTheme.saleBadgeText,
            '--sf-rating-color': productCard.ratingStar || cssTheme.ratingColor,
            '--sf-footer-bg': footer.background || cssTheme.footerBackground,
            '--sf-footer-background': footer.background || cssTheme.footerBackground,
            '--sf-footer-text': footer.text || cssTheme.footerText,
            '--sf-footer-link': footer.link || cssTheme.footerLink,
            '--sf-footer-link-hover': footer.linkHover || brand.primary || cssTheme.accent,
            '--sf-heading-font': cssTheme.headingFont,
            '--sf-heading-weight': cssTheme.headingWeight,
            '--sf-base-size': `${cssTheme.baseSize}px`,
            '--sf-checkout-radius': cssTheme.checkoutButtonRadius,
            '--sf-checkout-background': checkout.background || '#f8fafc',
            '--sf-checkout-card-background': checkout.cardBackground || '#ffffff',
            '--sf-checkout-text': checkout.text || '#0f172a',
            '--sf-checkout-button-background': checkout.buttonBackground || '#0f172a',
            '--sf-checkout-button-text': checkout.buttonText || '#ffffff',
            '--sf-checkout-accent': checkout.accent || brand.primary || cssTheme.accent,
            '--sf-checkout-input-background': checkout.inputBackground || '#ffffff',
            '--sf-checkout-input-border': checkout.inputBorder || '#cbd5e1',
            '--sf-checkout-input-focus': checkout.inputFocus || brand.primary || cssTheme.accent,
            '--sf-checkout-error': checkout.error || '#dc2626',
            '--sf-checkout-success': checkout.success || '#047857',
            fontFamily: cssTheme.fontFamily,
            fontSize: `${cssTheme.baseSize}px`,
            color: cssTheme.foreground,
            backgroundColor: cssTheme.background,
            minHeight: '100vh',
        };
    }, [cssTheme]);

    const contextValue = useMemo(() => ({
        settings,
        theme,
        cssTheme,
        hydrateThemeSettings,
    }), [settings, theme, cssTheme, hydrateThemeSettings]);

    return (
        <StorefrontThemeContext.Provider value={contextValue}>
            <div style={style}>{children}</div>
        </StorefrontThemeContext.Provider>
    );
}
