"use client";
import { useEffect, useMemo } from 'react';
import { PageTemplateRenderer, resolveAdaptivePage } from '@scaleup/storefront-renderer/adaptive';
import { getAdaptiveColorTokens } from '@scaleup/storefront-theme/adaptive';
import StorefrontPresentationRuntime from './StorefrontPresentationRuntime';
import { useStorefrontProductActions } from '@/hooks/useStorefrontProductActions';

export default function PublishedAdaptivePage({ projection, pageKind, theme, renderCore, catalogActions, fallback, subdomain }) {
    const productActions = useStorefrontProductActions({ subdomain });
    const resolved = useMemo(() => resolveAdaptivePage({ siteBuilder: projection.siteBuilder, pageKind,
        colorTokens: getAdaptiveColorTokens(theme) }), [projection.siteBuilder, pageKind, theme]);
    const assets = useMemo(() => Object.fromEntries((projection.assets || []).map(asset => [asset.id, asset])), [projection.assets]);
    useEffect(() => {
        if (!resolved.valid) console.warn('store_builder_adaptive_renderer_fallback', { pageKind, revision: projection.revision,
            codes: [...new Set(resolved.errors.map(error => error.code))].slice(0, 5) });
    }, [resolved, pageKind, projection.revision]);
    if (!resolved.valid) return fallback;
    return <StorefrontPresentationRuntime><PageTemplateRenderer pageKind={pageKind} plan={resolved.value}
        data={{ assets, sources: projection.sourcesByTemplate?.[resolved.value.templateId] || {}, catalogLayout: theme.layout, productCard: theme.productCard }}
        actions={{ core: { render: renderCore }, catalog: catalogActions || { addToCart: productActions.addProductToCart, buyNow: productActions.buyNow } }} />
        {productActions.variantPicker}</StorefrontPresentationRuntime>;
}
