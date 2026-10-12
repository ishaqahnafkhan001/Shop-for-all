"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { getReferenceThemeStyle } from '@/components/storefront/ReferenceStorefront';
import { FALLBACK_THEME, getThemeCssVars } from '@/lib/theme';

const StorefrontThemeContext = createContext({
    settings: null,
    theme: FALLBACK_THEME,
    cssTheme: getThemeCssVars(FALLBACK_THEME),
});

export const useStorefrontTheme = () => useContext(StorefrontThemeContext);

export default function StorefrontThemeProvider({ subdomain, settings = null, children }) {
    // Tenant layouts must supply a resolved public snapshot. No client request or
    // child effect may replace it after hydration. Defaults serve platform pages only.
    if (subdomain && !settings?.theme) {
        throw new Error('A published storefront theme is required for tenant rendering.');
    }
    const theme = settings?.theme || FALLBACK_THEME;
    const cssTheme = useMemo(() => getThemeCssVars(theme), [theme]);

    const style = useMemo(() => ({ ...getReferenceThemeStyle(theme), minHeight: '100vh' }), [theme]);

    const contextValue = useMemo(() => ({
        settings,
        theme,
        cssTheme,
    }), [settings, theme, cssTheme]);

    return (
        <StorefrontThemeContext.Provider value={contextValue}>
            <div className="sf-presentation" style={style}>{children}</div>
        </StorefrontThemeContext.Provider>
    );
}
