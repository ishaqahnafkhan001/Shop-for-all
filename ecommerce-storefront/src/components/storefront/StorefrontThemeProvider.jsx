"use client";

import React, { useEffect, useMemo, useState } from 'react';
import API from '@/api/api';

const FALLBACK_THEME = {
    accent: '#4f46e5',
    accentHover: '#4338ca',
    accentSoft: '#c7d2fe',
    accentBg: '#eef2ff',
    accentStrong: '#3730a3',
    accentMuted: '#818cf8',
    accentLight: '#a5b4fc',
    accentRing: '#e0e7ff',
    background: '#ffffff',
    foreground: '#111827',
    headerBackground: '#ffffff',
};

const THEME_KEYS = Object.keys(FALLBACK_THEME);
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const sanitizeTheme = (themeCandidate = {}) => {
    const colors = themeCandidate.colors || themeCandidate;
    const safe = THEME_KEYS.reduce((acc, key) => {
        const value = colors[key];
        acc[key] = HEX_COLOR_REGEX.test(value) ? value : FALLBACK_THEME[key];
        return acc;
    }, {});
    safe.fontFamily = themeCandidate.typography?.bodyFont || themeCandidate.fontFamily || 'Arial, Helvetica, sans-serif';
    safe.headingFont = themeCandidate.typography?.headingFont || themeCandidate.fontFamily || 'Arial, Helvetica, sans-serif';
    safe.baseSize = Number(themeCandidate.typography?.baseSize) || 16;
    safe.headingWeight = themeCandidate.typography?.headingWeight || '800';
    safe.checkoutButtonRadius = themeCandidate.checkoutBranding?.buttonStyle === 'Pill'
        ? '999px'
        : themeCandidate.checkoutBranding?.buttonStyle === 'Solid'
            ? '10px'
            : '16px';
    return safe;
};

export default function StorefrontThemeProvider({ subdomain, children }) {
    const [theme, setTheme] = useState(FALLBACK_THEME);

    useEffect(() => {
        let isMounted = true;

        const loadTheme = async () => {
            if (!subdomain) {
                setTheme(FALLBACK_THEME);
                return;
            }

            try {
                const response = await API.get(`/store-builder/storefront/${subdomain}`);
                const themeFromApi = response.data?.data?.theme || {};
                const safeTheme = sanitizeTheme(themeFromApi);

                if (isMounted) setTheme(safeTheme);
            } catch (error) {
                if (isMounted) setTheme(FALLBACK_THEME);
            }
        };

        loadTheme();

        return () => {
            isMounted = false;
        };
    }, [subdomain]);

    const style = useMemo(() => ({
        '--sf-accent': theme.accent,
        '--sf-accent-hover': theme.accentHover,
        '--sf-accent-soft': theme.accentSoft,
        '--sf-accent-bg': theme.accentBg,
        '--sf-accent-strong': theme.accentStrong,
        '--sf-accent-muted': theme.accentMuted,
        '--sf-accent-light': theme.accentLight,
        '--sf-accent-ring': theme.accentRing,
        '--sf-background': theme.background,
        '--sf-foreground': theme.foreground,
        '--sf-header-background': theme.headerBackground,
        '--sf-heading-font': theme.headingFont,
        '--sf-heading-weight': theme.headingWeight,
        '--sf-base-size': `${theme.baseSize}px`,
        '--sf-checkout-radius': theme.checkoutButtonRadius,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.baseSize}px`,
        color: theme.foreground,
        backgroundColor: theme.background,
    }), [theme]);

    return <div style={style}>{children}</div>;
}
