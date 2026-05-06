"use client";

import React, { useEffect, useMemo, useState } from 'react';

const FALLBACK_THEME = {
    accent: '#4f46e5',
    accentHover: '#4338ca',
    accentSoft: '#c7d2fe',
    accentBg: '#eef2ff',
    accentStrong: '#3730a3',
    accentMuted: '#818cf8',
    accentLight: '#a5b4fc',
    accentRing: '#e0e7ff',
};

const THEME_KEYS = Object.keys(FALLBACK_THEME);
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const sanitizeTheme = (themeCandidate = {}) => {
    return THEME_KEYS.reduce((acc, key) => {
        const value = themeCandidate[key];
        acc[key] = HEX_COLOR_REGEX.test(value) ? value : FALLBACK_THEME[key];
        return acc;
    }, {});
};

export default function StorefrontThemeProvider({ subdomain, children }) {
    const [theme, setTheme] = useState(FALLBACK_THEME);

    useEffect(() => {
        let isMounted = true;

        const loadTheme = async () => {
            try {
                const response = await fetch('/storefront-colors.json', { cache: 'no-store' });
                if (!response.ok) throw new Error('Theme file could not be loaded');

                const colorMap = await response.json();
                const themeFromFile = colorMap?.[subdomain] || colorMap?.default || {};
                const safeTheme = sanitizeTheme(themeFromFile);

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
    }), [theme]);

    return <div style={style}>{children}</div>;
}