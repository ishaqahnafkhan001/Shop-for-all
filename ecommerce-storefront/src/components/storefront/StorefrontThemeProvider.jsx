"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import API from '@/api/api';
import { FALLBACK_THEME, getThemeCssVars, normalizeTheme } from '@/lib/theme';

const StorefrontThemeContext = createContext({
    settings: null,
    theme: FALLBACK_THEME,
    cssTheme: getThemeCssVars(FALLBACK_THEME),
});

export const useStorefrontTheme = () => useContext(StorefrontThemeContext);

export default function StorefrontThemeProvider({ subdomain, children }) {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const loadTheme = async () => {
            if (!subdomain) {
                setSettings(null);
                return;
            }

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
    }, [subdomain]);

    const theme = useMemo(() => normalizeTheme(settings?.theme || {}), [settings?.theme]);
    const cssTheme = useMemo(() => getThemeCssVars(theme), [theme]);

    const style = useMemo(() => ({
        '--sf-accent': cssTheme.accent,
        '--sf-accent-hover': cssTheme.accentHover,
        '--sf-accent-soft': cssTheme.accentSoft,
        '--sf-accent-bg': cssTheme.accentBg,
        '--sf-accent-strong': cssTheme.accentStrong,
        '--sf-accent-muted': cssTheme.accentMuted,
        '--sf-accent-light': cssTheme.accentLight,
        '--sf-accent-ring': cssTheme.accentRing,
        '--sf-background': cssTheme.background,
        '--sf-foreground': cssTheme.foreground,
        '--sf-header-background': cssTheme.headerBackground,
        '--sf-primary-button-bg': cssTheme.primaryButtonBg,
        '--sf-primary-button-text': cssTheme.primaryButtonText,
        '--sf-primary-button-hover-bg': cssTheme.primaryButtonHoverBg,
        '--sf-secondary-button-bg': cssTheme.secondaryButtonBg,
        '--sf-secondary-button-text': cssTheme.secondaryButtonText,
        '--sf-secondary-button-hover-bg': cssTheme.secondaryButtonHoverBg,
        '--sf-navbar-bg': cssTheme.navbarBackground,
        '--sf-navbar-text': cssTheme.navbarText,
        '--sf-navbar-hover': cssTheme.navbarHover,
        '--sf-card-bg': cssTheme.cardBackground,
        '--sf-card-border': cssTheme.cardBorder,
        '--sf-card-hover-border': cssTheme.cardHoverBorder,
        '--sf-price-color': cssTheme.priceColor,
        '--sf-sale-badge-bg': cssTheme.saleBadgeBg,
        '--sf-sale-badge-text': cssTheme.saleBadgeText,
        '--sf-rating-color': cssTheme.ratingColor,
        '--sf-footer-bg': cssTheme.footerBackground,
        '--sf-footer-text': cssTheme.footerText,
        '--sf-footer-link': cssTheme.footerLink,
        '--sf-heading-font': cssTheme.headingFont,
        '--sf-heading-weight': cssTheme.headingWeight,
        '--sf-base-size': `${cssTheme.baseSize}px`,
        '--sf-checkout-radius': cssTheme.checkoutButtonRadius,
        fontFamily: cssTheme.fontFamily,
        fontSize: `${cssTheme.baseSize}px`,
        color: cssTheme.foreground,
        backgroundColor: cssTheme.background,
        minHeight: '100vh',
    }), [cssTheme]);

    const contextValue = useMemo(() => ({
        settings,
        theme,
        cssTheme,
    }), [settings, theme, cssTheme]);

    return (
        <StorefrontThemeContext.Provider value={contextValue}>
            <div style={style}>{children}</div>
        </StorefrontThemeContext.Provider>
    );
}
