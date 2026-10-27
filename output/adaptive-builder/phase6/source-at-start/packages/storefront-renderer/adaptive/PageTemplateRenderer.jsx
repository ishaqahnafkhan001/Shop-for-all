"use client";
import { useId } from 'react';
import { Image, Link, PresentationRuntime } from '../presentation/Runtime.jsx';
import { HomepageSection } from '../reference/StorefrontSectionRenderer.jsx';
import { isNextImageAllowed, shouldUseUnoptimizedImage } from '../imageDomains.js';
import { isAdaptivePagePlan } from './pagePlan.js';
import { compileAdaptiveStyles } from './styleCompiler.js';
import { ProtectedCore } from './ProtectedCore.jsx';

const hrefFor = destination => ({ storePath: destination.path, https: destination.url,
    email: `mailto:${destination.address}`, phone: `tel:${destination.number}` })[destination.kind];
const approvedAsset = asset => asset && typeof asset.url === 'string'
    && /^(?:\/(?!\/)|https:\/\/)/.test(asset.url) && !/[\\\s<>]/u.test(asset.url)
    && isNextImageAllowed(asset.url);
function Block({ id, plan, data, actions, editor }) {
    const node = plan.nodes[id];
    const props = { 'data-ab-node': id, 'data-ab-type': node.type, 'data-ab-style': node.styleId, ...(editor ? { tabIndex: 0 } : {}) };
    if (node.type.endsWith('.core')) return <div {...props} data-ab-core={plan.pageKind}><div data-ab-part="surface"><ProtectedCore pageKind={plan.pageKind} data={data.core} actions={actions.core} /></div></div>;
    const children = Object.values(node.slots || {}).flat().map(child => <Block key={child} id={child} plan={plan} data={data} actions={actions} editor={editor} />);
    switch (node.type) {
        case 'content.section': return <section {...props}>{children}</section>;
        case 'layout.stack': case 'layout.columns': return <div {...props}>{children}</div>;
        case 'content.text': return node.content.kind === 'heading'
            ? <h2 {...props}>{node.content.text}</h2> : <p {...props}>{node.content.text}</p>;
        case 'content.link': return <Link {...props} href={hrefFor(node.content.destination)}><span data-ab-part="label">{node.content.label}</span></Link>;
        case 'content.image': {
            // Asset IDs are joined to the backend's tenant-checked public media
            // projection by trusted code. Configuration never supplies a URL.
            const asset = data.assets?.[node.content.assetId];
            return <div {...props}>{approvedAsset(asset) ? <Image src={asset.url} width={asset.width} height={asset.height}
                alt={node.content.alt} unoptimized={shouldUseUnoptimizedImage(asset.url)} />
                : <span role="img" aria-label={node.content.alt || 'Image unavailable'}>Image unavailable</span>}</div>;
        }
        case 'catalog.products': case 'catalog.categories': {
            const source = data.sources?.[id];
            // Already tenant/public-eligibility filtered and batch-resolved.
            const products = (source?.products || []).slice(0, node.source.productIds?.length || node.source.limit);
            const categories = (source?.categories || []).slice(0, node.source.limit);
            return <div {...props}><HomepageSection adaptiveParts section={{ id, type: node.type === 'catalog.products' ? 'FeaturedProducts' : 'CategoryList' }}
                sectionProducts={{ [id]: products }} catalogProducts={products} categories={categories}
                layout={data.catalogLayout || {}} productCard={data.productCard || {}} mobile={{}} LinkComponent={Link}
                onProductAdd={actions.catalog?.addToCart} onProductBuyNow={actions.catalog?.buyNow} /></div>;
        }
        default: throw new TypeError('Resolved plan contained an unsupported block.');
    }
}

// Preview and future live callers use this same entry. No context-dependent DOM
// fork, viewport read, data fetching, or merchant action/component selection.
export function PageTemplateRenderer({ plan, pageKind, data = {}, actions = {}, runtime, editor = false }) {
    const identity = useId();
    const scope = `ab_${Array.from(identity, char => char.codePointAt(0).toString(16).padStart(4, '0')).join('')}`;
    const valid = isAdaptivePagePlan(plan) && plan.pageKind === pageKind;
    const content = valid ? <div className="sf-adaptive" data-ab-scope={scope} data-ab-template={plan.templateId}>
        <style>{compileAdaptiveStyles(plan, scope)}</style>
        {plan.rootOrder.map(id => <Block key={id} id={id} plan={plan} data={data} actions={actions} editor={editor} />)}
    </div> : <div data-ab-fallback="invalid-plan">
        <p role="alert">The store design could not load.</p>
        <ProtectedCore pageKind={pageKind} data={data.core} actions={actions.core} />
    </div>;
    return runtime ? <PresentationRuntime value={runtime}>{content}</PresentationRuntime> : content;
}
