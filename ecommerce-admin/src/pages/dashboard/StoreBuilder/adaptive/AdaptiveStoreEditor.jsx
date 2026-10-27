import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BLOCK_REGISTRY, LIMITS, PAGE_TEMPLATES } from '@scaleup/storefront-theme/adaptive';
import { validateStoredTheme } from '@scaleup/storefront-theme/storage';
import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { ADAPTIVE_RENDER_CAPABILITIES, PageTemplateRenderer, resolveAdaptivePage } from '@scaleup/storefront-renderer/adaptive';
import { getReferenceThemeStyle } from '@scaleup/storefront-renderer';
import { NativeImage } from '@scaleup/storefront-renderer/presentation/Runtime';
import { StorefrontPreviewFrame } from '../StorefrontPreviewFrame.jsx';
import { AdaptiveInspector, DraftField } from './AdaptiveInspector.jsx';
import { applyAdaptiveEdit, compatiblePlacements, createBlockFragment, editorTokens, flattenTree, PAGE_GROUPS,
    mayOpenAdaptiveEditor, nodeLabel, regionTemplateId, selectedIssue, validateSelection, VIEWPORTS } from './adaptiveEditorState.js';
import './adaptiveEditor.css';
import { createPreviewCore, PREVIEW_ACTIONS, PREVIEW_SCENARIOS } from './previewState.js';

const inert = () => {};
const PreviewLink = ({ children, prefetch, ...props }) => { void prefetch; return <a {...props} onClick={event => event.preventDefault()}>{children}</a>; };
const RUNTIME = Object.freeze({ Link: PreviewLink, Image: NativeImage });
const RenderPreview = memo(function RenderPreview({ plan, region, data, editing }) {
    return <PageTemplateRenderer plan={plan} pageKind={region} data={data} actions={PREVIEW_ACTIONS} runtime={RUNTIME} editor={editing} />;
});
export function AdaptiveStoreEditor(props) {
    return mayOpenAdaptiveEditor(props.theme, props.availability) ? <AdaptiveEditorWorkspace {...props} />
        : <p role="status">Adaptive editing is disabled by the server. Your current store is unchanged.</p>;
}
function AdaptiveEditorWorkspace({ theme, onThemeChange, shop = {}, products = [], categories = [], assets = [], onUpload, uploading,
    onIssuesChange = inert, onHistoryBoundary = inert, issueNavigationRef }) {
    const [region, setRegion] = useState('home'), [viewport, setViewport] = useState('desktop'), [mode, setMode] = useState('quick');
    const [scenario, setScenario] = useState('content');
    const [selection, setSelection] = useState(null), [collapsed, setCollapsed] = useState(new Set()), [panel, setPanel] = useState('structure');
    const [previewOnly, setPreviewOnly] = useState(false), [savedPreview, setSavedPreview] = useState(null), [errors, setErrors] = useState([]);
    const [addType, setAddType] = useState('content.section'), [addTarget, setAddTarget] = useState('0'), [moveTarget, setMoveTarget] = useState('0');
    const [focusProperty, setFocusProperty] = useState(null);
    const treeRef = useRef(null), canvasRef = useRef(null), inspectorRef = useRef(null);
    const document = theme.siteBuilder, templateId = regionTemplateId(document, region), tree = document.templates[templateId];
    const tokens = useMemo(() => editorTokens(theme), [theme]);
    const selected = validateSelection(document, { ...selection, viewport }) || { templateId, nodeId: null, partId: null, viewport };
    // Region and selected-template identity must agree after undo or recovery.
    const current = selected.templateId === templateId ? selected : { templateId, nodeId: null, partId: null, viewport };
    const node = tree?.nodes[current.nodeId], block = node && BLOCK_REGISTRY[node.type];
    const flat = useMemo(() => tree ? flattenTree(tree) : [], [tree]);
    const selectedRow = flat.find(row => row.nodeId === current.nodeId);
    const visibleRows = flat.filter(row => { let parent = row.parentId; while (parent) { if (collapsed.has(parent)) return false; parent = flat.find(item => item.nodeId === parent)?.parentId; } return true; });
    const savedPreviewResult = useMemo(() => {
        const targetId = regionTemplateId(theme.siteBuilder, region), target = theme.siteBuilder.templates[targetId];
        if (!savedPreview || !target) return null;
        return applyAdaptiveEdit(theme, { kind: 'insertSaved', templateId: targetId, savedSectionId: savedPreview, placement: { index: target.rootOrder.length } });
    }, [theme, savedPreview, region]);
    const previewTheme = savedPreviewResult?.valid ? savedPreviewResult.value : theme;
    const resolution = useMemo(() => resolveAdaptivePage({ siteBuilder: previewTheme.siteBuilder, pageKind: region, colorTokens: tokens }), [previewTheme, region, tokens]);
    useEffect(() => { onIssuesChange([...errors, ...(resolution.errors || [])]); }, [errors, resolution, onIssuesChange]);
    const plan = resolution.value;
    const data = useMemo(() => ({ core: createPreviewCore(region, scenario, { theme: previewTheme, shop, products }),
        assets: Object.fromEntries(assets.map(asset => [String(asset.assetId), asset])),
        sources: Object.fromEntries(Object.entries(plan?.nodes || {}).filter(([, node]) => node.source).map(([id, node]) => [id,
            node.type === 'catalog.products' ? { products: node.source.kind === 'manualProducts' ? (node.source.productIds || []).map(id => products.find(product => String(product._id) === id)).filter(Boolean) : products }
                : { categories }])) }), [previewTheme, plan, shop, assets, products, categories, region, scenario]);
    const fallbackStyle = useMemo(() => { const fallback = { ...theme, version: 4 }; delete fallback.siteBuilder; return getReferenceThemeStyle(fallback); }, [theme]);
    const report = issues => { setErrors(issues); onIssuesChange(issues); };
    const run = command => {
        let result = applyAdaptiveEdit(theme, command);
        if (result.valid) {
            const rendered = resolveAdaptivePage({ siteBuilder: result.value.siteBuilder, pageKind: region, colorTokens: editorTokens(result.value) });
            if (!rendered.valid) result = rendered;
        }
        if (result.valid) { report([]); setSavedPreview(null); if (JSON.stringify(result.value.siteBuilder) !== JSON.stringify(theme.siteBuilder)) onThemeChange(result.value); }
        else report(result.errors.map(issue => ({ ...issue, path: issue.path?.[0] === 'templates' ? ['siteBuilder', ...issue.path] : issue.path,
            target: current, property: command.property })));
        return result;
    };
    const rootChange = candidate => { const result = validateStoredTheme(candidate); if (result.valid) { report([]); onThemeChange(candidate); } else report(result.errors); return result; };
    const select = (nodeId, partId = null, reveal = true) => { onHistoryBoundary(); setFocusProperty(null); setMoveTarget('0'); setSelection({ templateId, nodeId, partId, viewport }); if (reveal) setPanel('inspector'); };
    const chooseRegion = name => { onHistoryBoundary(); setRegion(name); setScenario(PREVIEW_SCENARIOS[name][0]); setSelection(null); setSavedPreview(null); setAddType('content.section'); setAddTarget('0'); setMoveTarget('0'); setFocusProperty(null); setPanel('structure'); };
    const locate = id => { const frame = canvasRef.current?.querySelector('iframe'); const element = [...(frame?.contentDocument?.querySelectorAll('[data-ab-node]') || [])].find(item => item.dataset.abNode === id); element?.scrollIntoView({ block: 'center', behavior: 'auto' }); element?.focus({ preventScroll: true }); };
    const previewSelect = event => {
        // Parent-side capture is required: iframe sandboxing alone cannot stop
        // a React event handler from calling a parent application's API.
        event.preventDefault(); event.stopPropagation();
        if (previewOnly || savedPreview) return;
        const element = event.target.closest?.('[data-ab-node]');
        if (!element || !tree.nodes[element.dataset.abNode]) return;
        const nodeId = element.dataset.abNode, definition = BLOCK_REGISTRY[tree.nodes[nodeId].type];
        let partId = event.target.closest('[data-ab-part]')?.dataset.abPart;
        if (tree.nodes[nodeId].type === 'catalog.products') partId = event.target.closest('article') ? 'card' : event.target.closest('h2') ? 'title' : partId;
        select(nodeId, Object.hasOwn(definition.parts, partId) ? partId : null);
    };
    const previewKey = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setSelection(null); }
        else if (['Enter', ' '].includes(event.key)) { previewSelect(event); requestAnimationFrame(() => inspectorRef.current?.querySelector('button,input,textarea,select')?.focus()); } };
    const allIssues = [...errors, ...(resolution.errors || [])];
    const focusIssue = issue => {
        const target = selectedIssue(document, issue, viewport) || validateSelection(document, issue.target);
        if (!target) return;
        setFocusProperty(issue.property || null);
        if (target.partId) setMode('advanced');
        else if (issue.property) setMode('design');
        setRegion(document.templates[target.templateId].pageKind); setSelection(target); setPanel('inspector');
        requestAnimationFrame(() => { locate(target.nodeId); const field = [...(inspectorRef.current?.querySelectorAll('[data-adaptive-control]') || [])].find(item => item.dataset.adaptiveControl === issue.property); (field?.querySelector('input,textarea') || field?.querySelector('select'))?.focus(); });
    };
    useLayoutEffect(() => { if (issueNavigationRef) { issueNavigationRef.current = focusIssue; return () => { issueNavigationRef.current = null; }; } });
    if (!tree) return <section className="adaptive-workspace" role="status">This region has no assigned adaptive template. Adoption and template creation remain disabled.</section>;
    const addBlockType = ['hero', 'story', 'promotion', 'banner'].includes(addType) ? 'content.section' : addType;
    const additions = compatiblePlacements(tree, addBlockType);
    const moves = node ? compatiblePlacements(tree, node.type, current.nodeId) : [];
    const order = selectedRow ? selectedRow.parentId ? tree.nodes[selectedRow.parentId].slots[selectedRow.slot] : tree.rootOrder : [];
    const position = order.indexOf(current.nodeId);
    const move = offset => run({ kind: 'move', templateId, nodeId: current.nodeId, placement: {
        ...(selectedRow.parentId ? { parentId: selectedRow.parentId, slot: selectedRow.slot } : {}), index: position + offset } });
    const availableKinds = ['hero', 'story', 'promotion', ...(BLOCK_REGISTRY['content.image'].pageKinds.includes(region) ? ['banner'] : []), ...Object.keys(ADAPTIVE_RENDER_CAPABILITIES[region].blocks).filter(type => !BLOCK_REGISTRY[type].protected)];
    const pendingFragment = createBlockFragment(document, availableKinds.includes(addType) ? addType : 'content.section', assets[0]?.assetId);
    const addedNodes = Object.keys(pendingFragment.nodes).length;
    const totalNodes = [...Object.values(document.templates), ...Object.values(document.savedSections)].reduce((count, entry) => count + Object.keys(entry.nodes).length, 0);
    const addLimit = Object.keys(tree.nodes).length + addedNodes > LIMITS.nodesPerTemplate || totalNodes + addedNodes > LIMITS.totalNodes;
    const selectTree = (event, row, index) => {
        const key = event.key;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(key)) return;
        event.preventDefault();
        let next;
        if (key === 'ArrowUp') next = visibleRows[Math.max(0, index - 1)];
        if (key === 'ArrowDown') next = visibleRows[Math.min(visibleRows.length - 1, index + 1)];
        if (key === 'Home') next = visibleRows[0]; if (key === 'End') next = visibleRows.at(-1);
        if (key === 'ArrowLeft') { if (!collapsed.has(row.nodeId) && tree.nodes[row.nodeId].slots) setCollapsed(old => new Set([...old, row.nodeId])); else next = flat.find(item => item.nodeId === row.parentId); }
        if (key === 'ArrowRight') { setCollapsed(old => { const value = new Set(old); value.delete(row.nodeId); return value; }); next = flat.find(item => item.parentId === row.nodeId); }
        if (key === 'Enter' || key === ' ') { select(row.nodeId); locate(row.nodeId); }
        if (key === 'Escape') setSelection(null);
        if (next) { select(next.nodeId, null, false); requestAnimationFrame(() => [...(treeRef.current?.querySelectorAll('[role="treeitem"]') || [])].find(item => item.dataset.nodeId === next.nodeId)?.focus()); }
    };
    return <section className="adaptive-workspace" aria-label="Adaptive visual store editor">
        <div className="adaptive-toolbar"><label className="text-sm font-semibold">Page or global region <select aria-label="Page or global region" value={region} onChange={e => chooseRegion(e.target.value)}>{Object.entries(PAGE_GROUPS).map(([label, pages]) => <optgroup key={label} label={label}>{Object.entries(pages).map(([name, title]) => <option key={name} disabled={!regionTemplateId(document, name)} value={name}>{title}</option>)}</optgroup>)}</select></label>
            <label className="text-sm font-semibold">Synthetic state <select aria-label="Synthetic preview state" value={PREVIEW_SCENARIOS[region].includes(scenario) ? scenario : PREVIEW_SCENARIOS[region][0]} onChange={event => { onHistoryBoundary(); setScenario(event.target.value); }}>{PREVIEW_SCENARIOS[region].map(name => <option key={name}>{name}</option>)}</select></label>
            {['quick', 'design', 'advanced'].map(name => <button key={name} type="button" aria-pressed={mode === name} onClick={() => setMode(name)}>{name === 'quick' ? 'Quick Edit' : name === 'design' ? 'Design Mode' : 'Advanced Mode'}</button>)}
            {Object.entries(VIEWPORTS).map(([tier, device]) => <button type="button" key={tier} aria-pressed={viewport === tier} onClick={() => { onHistoryBoundary(); setViewport(tier); }}>{device.label}</button>)}
            <button type="button" aria-pressed={previewOnly} onClick={() => setPreviewOnly(value => !value)}>{previewOnly ? 'Return to editing' : 'Preview only'}</button>
        </div>
        <p className="mb-3 text-xs text-slate-600">{region} / {node ? nodeLabel(tree, current.nodeId) : 'Page'}{current.partId ? ` / ${current.partId}` : ''} · {VIEWPORTS[viewport].width}px · Live data and actions are isolated in this preview.</p>
        <div className="adaptive-small-switch">{['structure', 'preview', 'inspector'].map(name => <button key={name} type="button" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" aria-pressed={panel === name} onClick={() => setPanel(name)}>{name}</button>)}</div>
        {allIssues.length > 0 && <div role="alert" aria-label="Adaptive design issues">{allIssues.map((issue, index) => <button className="adaptive-issue" type="button" key={`${issue.code}-${index}`} onClick={() => focusIssue(issue)}>{issue.message} · {issue.code}</button>)}</div>}
        <div className="adaptive-columns" data-preview-only={previewOnly}>
            <aside className="adaptive-panel" data-active={panel === 'structure'} aria-label="Page structure">
                <button type="button" className="min-h-11 font-bold text-indigo-700" onClick={() => select(null)}>Page design</button>
                <ul className="adaptive-tree" role="tree" aria-label={`${region} section tree`} ref={treeRef}>{visibleRows.map((row, index) => { const item = tree.nodes[row.nodeId], protectedNode = BLOCK_REGISTRY[item.type].protected; return <li key={row.nodeId} role="treeitem" data-node-id={row.nodeId} aria-level={row.depth + 1} aria-selected={current.nodeId === row.nodeId} aria-expanded={item.slots ? !collapsed.has(row.nodeId) : undefined} tabIndex={current.nodeId === row.nodeId || (!current.nodeId && index === 0) ? 0 : -1}
                    style={{ paddingInlineStart: row.depth * 16 + 4 }} onClick={() => select(row.nodeId)} onKeyDown={e => selectTree(e, row, index)}><span aria-hidden="true">{protectedNode ? '🔒' : item.slots ? collapsed.has(row.nodeId) ? '▸' : '▾' : '·'}</span><span className="min-w-0 text-sm">{nodeLabel(tree, row.nodeId)}{item.styles?.[viewport]?.visible === false ? ' (hidden)' : ''}{protectedNode ? ' · required' : ''}</span></li>; })}</ul>
                {node && <div className="adaptive-actions" aria-label="Selected block actions">
                    <button type="button" onClick={() => locate(current.nodeId)}>Locate</button><button type="button" disabled={!selectedRow?.parentId} onClick={() => select(selectedRow.parentId)}>Select parent</button>
                    <button type="button" disabled={block.protected || position < (PAGE_TEMPLATES[region].requiredCore && !selectedRow?.parentId ? 2 : 1)} onClick={() => move(-1)}>Move up</button><button type="button" disabled={block.protected || position >= order.length - 1} onClick={() => move(1)}>Move down</button>
                    <button type="button" disabled={block.protected} onClick={() => run({ kind: 'copy', templateId, nodeId: current.nodeId, placement: { ...(selectedRow.parentId ? { parentId: selectedRow.parentId, slot: selectedRow.slot } : {}), index: position + 1 } })}>Duplicate</button>
                    <button type="button" disabled={block.protected} onClick={() => run({ kind: 'remove', templateId, nodeId: current.nodeId })}>Remove</button>
                    <button type="button" disabled={block.protected} onClick={() => run({ kind: 'setStyle', templateId, nodeId: current.nodeId, tier: viewport, property: 'visible', value: !(plan?.nodes[current.nodeId]?.styles[viewport]?.visible ?? true) })}>{plan?.nodes[current.nodeId]?.styles[viewport]?.visible === false ? 'Show' : 'Hide'}</button>
                    {block.protected && <p className="text-xs text-slate-600">Required functionality cannot be removed, hidden, duplicated or moved. Optional sections follow the core; blueprint v1 does not support sections before it.</p>}
                    {!block.protected && <><label className="grid w-full gap-1 text-xs">Move to<select className="min-h-11 rounded-lg border border-slate-300" value={moveTarget} onChange={e => setMoveTarget(e.target.value)}>{moves.map((target, i) => <option key={i} value={i}>{target.label}</option>)}</select></label><button type="button" disabled={!moves[Number(moveTarget)]} onClick={() => run({ kind: 'move', templateId, nodeId: current.nodeId, placement: moves[Number(moveTarget)].placement })}>Move into selected slot</button></>}
                </div>}
                <fieldset className="grid gap-2 border-t pt-4"><legend className="text-sm font-bold">Add compatible content</legend><select className="min-h-11 max-w-full rounded-lg border border-slate-300 text-sm" aria-label="Block type" value={availableKinds.includes(addType) ? addType : 'content.section'} onChange={e => { setAddType(e.target.value); setAddTarget('0'); }}>{availableKinds.map(type => <option key={type}>{type}</option>)}</select><select className="min-h-11 rounded-lg border border-slate-300 text-sm" aria-label="Insert into slot" value={addTarget} onChange={e => setAddTarget(e.target.value)}>{additions.map((target, i) => <option key={i} value={i}>{target.label}</option>)}</select><button type="button" className="min-h-11 rounded-lg bg-indigo-700 px-3 text-sm font-semibold text-white" disabled={addLimit || !additions[Number(addTarget)] || (addType === 'content.image' && !assets.length)} onClick={() => { onHistoryBoundary(); const fragment = pendingFragment; const result = run({ kind: 'add', templateId, fragment, placement: additions[Number(addTarget)].placement }); if (result.valid) select(fragment.rootId); }}>Add block</button><p className="text-xs text-slate-600">Sections accept registered children only. Image blocks need an available store image. Unsupported slots are omitted. {addLimit && 'This insertion exceeds the page or total node limit. Remove optional content first.'}</p></fieldset>
                {mode === 'advanced' && <div className="mt-5 grid gap-2"><h3 className="text-sm font-bold">Saved sections · independent copies</h3>{Object.entries(document.savedSections).map(([id, saved]) => <div className="rounded-lg border border-slate-200 p-2" key={id}><DraftField label="Saved section name" value={saved.name} maxLength={80} onChange={name => run({ kind: 'renameSaved', templateId, savedSectionId: id, name })} /><div className="adaptive-actions"><button type="button" onClick={() => setSavedPreview(id)}>Preview</button><button type="button" onClick={() => run({ kind: 'insertSaved', templateId, savedSectionId: id, placement: { index: tree.rootOrder.length } })}>Insert copy</button><button type="button" onClick={() => run({ kind: 'deleteSaved', templateId, savedSectionId: id })}>Delete saved definition</button></div></div>)}</div>}
            </aside>
            <div className="adaptive-canvas" data-active={panel === 'preview'} ref={canvasRef} aria-label="Live adaptive preview">
                {savedPreview && <p role={savedPreviewResult?.valid ? 'status' : 'alert'} className="mb-2 bg-white p-3 text-sm">{savedPreviewResult?.valid ? 'Saved-section preview only.' : `This saved section cannot be inserted here: ${savedPreviewResult?.errors?.[0]?.message || 'Incompatible page or limits.'}`} <button type="button" className="min-h-11 font-bold text-indigo-700" onClick={() => setSavedPreview(null)}>Close saved preview</button></p>}
                <StorefrontPreviewFrame width={VIEWPORTS[viewport].width} height={820} title={`${VIEWPORTS[viewport].label} ${region} design preview`}>
                    <div className="sf-presentation" data-sf-presentation={getStorefrontPresentationVariant(theme)} style={fallbackStyle} onClickCapture={previewSelect} onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); }} onKeyDownCapture={previewKey}>
                        <style>{`.sf-adaptive [data-ab-node]:focus-visible{outline:3px solid #4f46e5;outline-offset:2px}${!previewOnly ? '.sf-adaptive [data-ab-node]{outline:1px dashed #cbd5e1;outline-offset:-1px}' : ''}`}</style>
                        {current.nodeId && !previewOnly && <style>{`.sf-adaptive [data-ab-node="${current.nodeId}"]${current.partId ? ` [data-ab-part="${current.partId}"]` : ''}{outline:3px solid #4f46e5;outline-offset:2px}`}</style>}
                        {resolution.valid ? <RenderPreview plan={plan} region={region} data={data} editing={!previewOnly && !savedPreview} /> : <p role="alert">Preview paused until the indicated design issues are resolved.</p>}
                    </div>
                </StorefrontPreviewFrame>
            </div>
            <aside ref={inspectorRef} className="adaptive-panel adaptive-inspector" data-active={panel === 'inspector'} onFocusCapture={onHistoryBoundary} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) onHistoryBoundary(); }}>
                <AdaptiveInspector key={`${templateId}/${current.nodeId}/${current.partId}/${viewport}/${focusProperty}`} initialTab={focusProperty || current.partId ? 'design' : 'content'} theme={theme} selection={current} plan={plan} mode={mode} onSelectPart={partId => select(current.nodeId, partId)} run={run} assets={assets} products={products} onUpload={onUpload} uploading={uploading} onRootChange={rootChange} />
            </aside>
        </div>
    </section>;
}
