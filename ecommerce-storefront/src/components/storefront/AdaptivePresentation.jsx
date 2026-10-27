"use client";
import dynamic from 'next/dynamic';
import { cloneElement } from 'react';
import { useStorefrontTheme } from './StorefrontThemeProvider';

// Conditional client import preserves SSR and avoids executing the adaptive
// validator/compiler on v4 routes. Authority comes from the server snapshot,
// never local storage, query parameters or a browser feature flag.
const PublishedAdaptivePage = dynamic(() => import('./PublishedAdaptivePage'));
export default function AdaptivePresentation({ pageKind, children, core = false, renderCore, catalogActions }) {
    const { settings, theme } = useStorefrontTheme();
    const projection = settings?.adaptive;
    const assignment = ['header', 'footer'].includes(pageKind)
        ? projection?.siteBuilder?.globals?.[pageKind] : projection?.siteBuilder?.defaultTemplates?.[pageKind];
    const fallback = renderCore ? renderCore(false) : children;
    if (!projection || !assignment) return fallback;
    const trustedRender = renderCore || (core ? adaptiveParts => cloneElement(children, typeof children.type === 'string'
        ? (adaptiveParts ? { 'data-ab-part': 'surface' } : {}) : { adaptiveParts }) : undefined);
    return <PublishedAdaptivePage projection={projection} pageKind={pageKind} theme={theme}
        renderCore={trustedRender} catalogActions={catalogActions} fallback={fallback} subdomain={settings.subdomain} />;
}
