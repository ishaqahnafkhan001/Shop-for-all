"use client";

import { planHomepageComposition } from '@scaleup/storefront-theme';
import { getContainerClass, getContentGapClass, isPreviewNarrow } from './referenceCore';

// Layout only: nodes and actions are supplied by the existing Home renderer.
// No commerce queries, preset-ID branches or duplicate product renderers belong here.
export function StorefrontComposition({ layout, sections, isAvailable, renderSection, hero, afterHeroContent, catalog, previewDevice, presentationVariant }) {
    const plan = planHomepageComposition({ composition: layout.homepageComposition, sections, isAvailable });
    const container = presentationVariant === 'atelier-editorial' ? 'atelier-container atelier-home-content' : getContainerClass(layout);
    const narrow = isPreviewNarrow(previewDevice);
    const gap = getContentGapClass(layout.contentSpacing, layout.productGap);
    const slot = key => plan.slots[key] ? renderSection(plan.slots[key].section, plan.slots[key].index) : null;
    const remaining = plan.remaining.map(({ section, index }) => renderSection(section, index));
    const companion = slot('companion');

    if (plan.id === 'standard') return <>
        <div className={`${container} py-3.5 sm:py-8`}>
            {hero}
            {afterHeroContent}
            {remaining}
        </div>
        {catalog}
    </>;

    if (plan.id === 'boutique') {
        const collection = slot('collection');
        const story = slot('story');
        return <>
            <div data-composition-region="boutique-hero" className="min-w-0">{hero}</div>
            <div className={`${container} py-8 sm:py-12`}>
                {afterHeroContent}
                {(collection || story) && <div data-composition-region="curated-gallery" className={`grid min-w-0 ${gap} ${!narrow && collection && story ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start' : ''}`}>
                    {collection && <div className="min-w-0">{collection}</div>}
                    {story && <div className={`min-w-0 ${!narrow && collection ? 'lg:pt-12' : ''}`}>{story}</div>}
                </div>}
                {remaining}
            </div>
            {catalog}
        </>;
    }

    const editorial = plan.id === 'editorial';
    const columns = editorial
        ? 'lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-end'
        : 'lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)] lg:items-start';
    return <>
        <div className={`${container} py-3.5 sm:py-8`}>
            <div data-composition-region={editorial ? 'editorial-spread' : 'discovery-desk'} className={`grid min-w-0 ${gap} ${companion && !narrow ? columns : ''}`}>
                <div className="min-w-0">{hero}</div>
                {companion && <div data-composition-slot="companion" className={`min-w-0 ${editorial && !narrow ? 'lg:border-l lg:border-[var(--sf-card-border)] lg:pl-6' : ''}`}>
                    {companion}
                </div>}
            </div>
            {afterHeroContent}
            {remaining}
        </div>
        {catalog}
    </>;
}
