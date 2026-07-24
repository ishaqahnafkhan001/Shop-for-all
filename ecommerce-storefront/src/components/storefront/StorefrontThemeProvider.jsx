"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import API from '@/api/api';
import { getReferenceThemeStyle } from '@/components/storefront/ReferenceStorefront';
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
        const referenceStyle = getReferenceThemeStyle(theme);
        const groups = cssTheme.colorGroups || {};
        const brand = groups.brand || {};
        const header = groups.header || {};
        const productCard = groups.productCard || {};
        const allProducts = groups.allProducts || {};
        const sections = groups.sections || {};
        const footer = groups.footer || {};
        const checkout = groups.checkout || {};
        const storefrontForeground = brand.secondary || cssTheme.foreground;

        return {
            ...referenceStyle,
            '--background': cssTheme.background,
            '--foreground': storefrontForeground,
            '--sf-ink': storefrontForeground,
            '--sf-surface': productCard.background || checkout.cardBackground || cssTheme.cardBackground,
            '--sf-surface-subtle': allProducts.background || sections.background || checkout.background || cssTheme.accentBg,
            '--sf-surface-raised': sections.faqBackground || allProducts.filterBackground || '#f1f5f9',
            '--sf-border': productCard.border || header.border || cssTheme.cardBorder,
            '--sf-border-strong': checkout.inputBorder || '#cbd5e1',
            '--sf-text-muted': header.mutedText || allProducts.subtitle || footer.text || '#64748b',
            '--sf-success': checkout.success || '#047857',
            '--sf-success-bg': productCard.stockBackground || '#ecfdf5',
            '--sf-warning': '#d97706',
            '--sf-warning-bg': '#fffbeb',
            '--sf-danger': checkout.error || '#dc2626',
            '--sf-danger-bg': productCard.outOfStockBackground || '#fff1f2',
            '--sf-accent-strong': cssTheme.accentStrong,
            '--sf-accent-muted': cssTheme.accentMuted,
            '--sf-accent-light': cssTheme.accentLight,
            '--sf-accent-ring': brand.ring || cssTheme.accentRing,
            '--sf-background': cssTheme.background,
            '--sf-foreground': storefrontForeground,
            '--sf-header-background': header.background || cssTheme.headerBackground,
            '--sf-primary-button-hover-bg': cssTheme.primaryButtonHoverBg,
            '--sf-secondary-button-bg': cssTheme.secondaryButtonBg,
            '--sf-secondary-button-text': cssTheme.secondaryButtonText,
            '--sf-secondary-button-hover-bg': cssTheme.secondaryButtonHoverBg,
            '--sf-navbar-bg': header.background || cssTheme.navbarBackground,
            '--sf-card-bg': productCard.background || cssTheme.cardBackground,
            '--sf-footer-bg': footer.background || cssTheme.footerBackground,
            '--sf-heading-font': cssTheme.headingFont,
            '--sf-heading-weight': cssTheme.headingWeight,
            '--sf-base-size': `${cssTheme.baseSize}px`,
            '--sf-checkout-radius': cssTheme.checkoutButtonRadius,
            fontSize: `${cssTheme.baseSize}px`,
            minHeight: '100vh',
        };
    }, [cssTheme, theme]);

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
