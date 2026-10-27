import { useState } from 'react';
import { BLOCK_REGISTRY, COLOR_TOKENS, PAGE_TEMPLATES, STYLE_PROPERTIES } from '@scaleup/storefront-theme/adaptive';
import { contrastRatio, getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { editorTokens, freshDesignId, styleOrigin } from './adaptiveEditorState.js';

const inputClass = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';
const labelFor = value => value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const quick = new Set(['color', 'background', 'textAlign', 'visible']);
const destinationFields = { storePath: 'path', https: 'url', email: 'address', phone: 'number' };
function LinkContent({ node, content }) {
    const [kind, setKind] = useState(node.content.destination.kind);
    const current = node.content.destination;
    return <><DraftField label="Link label" value={node.content.label} maxLength={120} onChange={value => content('label', value)} />
        <label className="grid gap-1 text-xs font-semibold">Link type<select className={inputClass} value={kind} onChange={event => setKind(event.target.value)}>{Object.keys(destinationFields).map(value => <option key={value}>{value}</option>)}</select></label>
        <DraftField key={kind} label="Destination" value={current.kind === kind ? current[destinationFields[kind]] : ''} maxLength={1000}
            onChange={value => content('destination', { kind, [destinationFields[kind]]: value })} />
        {current.kind !== kind && <p className="text-xs text-slate-600">Enter a valid destination to apply this link type. The existing link is preserved until then.</p>}
    </>;
}
export function DraftField({ label, value, onChange, type = 'text', multiline = false, encode = value => value, ...props }) {
    const [draft, setDraft] = useState(''), [editing, setEditing] = useState(false);
    const displayed = editing ? draft : String(value ?? '');
    const Field = multiline ? 'textarea' : 'input';
    return <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-700">{label}
        <Field {...props} type={multiline ? undefined : type} rows={multiline ? 4 : undefined} className={inputClass} value={displayed}
            onFocus={() => { setDraft(String(value ?? '')); setEditing(true); }}
            onChange={event => { setDraft(event.target.value); onChange(encode(event.target.value)); }}
            onBlur={() => { if (displayed === String(value ?? '') || onChange(encode(displayed))?.valid !== false) setEditing(false); }} />
    </label>;
}
function StyleControl({ property, value, functional, onChange, onAuto }) {
    const rule = STYLE_PROPERTIES[property], label = labelFor(property);
    if (rule.kind === 'color') return <div className="grid gap-2">
        <label className="grid gap-1 text-xs font-semibold text-slate-700">{label} source
            <select className={inputClass} value={value?.token || 'custom'} onChange={e => onChange(e.target.value === 'custom' ? { hex: '#ffffff' } : { token: e.target.value })}>
                <option value="custom">Custom solid color</option>{COLOR_TOKENS.map(token => <option key={token}>{token}</option>)}
            </select>
        </label>
        {!value?.token && <DraftField label={`${label} hex`} value={value?.hex || ''} placeholder="#112233" onChange={v => onChange({ hex: v })} maxLength={7} />}
    </div>;
    if (rule.values) return <label className="grid gap-1 text-xs font-semibold text-slate-700">{label}
        <select className={inputClass} value={value ?? ''} onChange={e => onChange(typeof rule.values[0] === 'number' ? Number(e.target.value) : e.target.value)}>
            <option value="" disabled>Inherited</option>{rule.values.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </label>;
    if (rule.kind === 'boolean') return <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={value ?? true} onChange={e => onChange(e.target.checked)} />{label}</label>;
    if (rule.kind === 'ratio') return <label className="grid gap-1 text-xs font-semibold text-slate-700">{label}
        <select className={inputClass} value={value ? `${value.width}/${value.height}` : ''} onChange={e => { const [width, height] = e.target.value.split('/').map(Number); onChange({ width, height }); }}>
            <option value="" disabled>Auto / inherited</option>{['1/1', '4/3', '3/4', '16/9', '9/16', ...(value ? [`${value.width}/${value.height}`] : [])].filter((v, i, a) => a.indexOf(v) === i).map(ratio => <option key={ratio}>{ratio}</option>)}
        </select>
    </label>;
    const numeric = rule.kind === 'number';
    const min = functional && property === 'fontSize' ? 14 : functional && property === 'lineHeight' ? 1.25 : functional && property === 'fontWeight' ? 400 : rule.min;
    const max = functional && property === 'fontSize' ? 48 : functional && property.startsWith('padding') ? 48 : rule.max;
    return <div className="grid gap-2">
        {rule.kind === 'dimension' && <label className="grid gap-1 text-xs font-semibold">{label} preset<select className={inputClass} value="" onChange={e => e.target.value === 'auto' ? onAuto() : onChange(e.target.value === 'full' ? { unit: 'percent', value: 100 } : { unit: 'px', value: Number(e.target.value) })}><option value="" disabled>Choose a size</option><option value="auto">Auto / inherited</option><option value="full">Full width</option><option value="640">Narrow · 640px</option><option value="960">Medium · 960px</option><option value="1280">Wide · 1280px</option></select></label>}
        <DraftField label={label} type="number" value={numeric ? value : value?.value} min={min} max={max} step={rule.step || (['lineHeight', 'letterSpacing'].includes(property) ? 0.1 : 1)}
            encode={v => numeric ? (v === '' ? NaN : Number(v)) : { unit: value?.unit || 'px', value: v === '' ? NaN : Number(v) }} onChange={onChange} />
        {rule.kind === 'dimension' && <label className="grid gap-1 text-xs font-semibold text-slate-700">{label} unit
            <select className={inputClass} value={value?.unit || 'px'} onChange={e => onChange({ unit: e.target.value, value: e.target.value === 'percent' ? 100 : 640 })}><option value="px">px</option><option value="percent">%</option></select>
        </label>}
    </div>;
}
export function AdaptiveInspector({ theme, selection, plan, mode, onSelectPart, run, assets = [], products = [], onUpload, uploading, onRootChange, initialTab = 'content' }) {
    const [tab, setTab] = useState(initialTab), [libraryName, setLibraryName] = useState('Saved design'), [resetEpoch, setResetEpoch] = useState(0);
    const tree = theme.siteBuilder.templates[selection.templateId], node = tree.nodes[selection.nodeId];
    const block = node && BLOCK_REGISTRY[node.type], part = selection.partId;
    const capability = node ? (part ? block.parts[part] : block.styles) : PAGE_TEMPLATES[tree.pageKind].styles;
    const resolved = node ? (part ? plan?.nodes[selection.nodeId]?.parts[part]?.[selection.viewport] : plan?.nodes[selection.nodeId]?.styles[selection.viewport]) : plan?.pageStyles[selection.viewport];
    const command = extra => { const result = run({ templateId: selection.templateId, ...extra }); if (result.valid && extra.kind.startsWith('reset')) setResetEpoch(value => value + 1); return result; };
    const style = (property, value) => command({ kind: 'setStyle', ...(node ? { nodeId: selection.nodeId } : {}), ...(part ? { partId: part } : {}), tier: selection.viewport, property, value });
    const reset = property => command({ kind: 'resetStyle', ...(node ? { nodeId: selection.nodeId } : {}), ...(part ? { partId: part } : {}), tier: selection.viewport, ...(property ? { property } : {}) });
    const content = (key, value) => command({ kind: 'content', nodeId: selection.nodeId, content: { ...node.content, [key]: value } });
    const controls = capability.filter(property => mode !== 'quick' || quick.has(property));
    const tokens = editorTokens(theme), foreground = resolved?.color?.hex || tokens[resolved?.color?.token] || tokens.foreground;
    const background = resolved?.background?.hex || tokens[resolved?.background?.token] || tokens.background;
    return <section className="grid min-w-0 gap-4" aria-label="Contextual design inspector">
        <div><h2 className="font-bold text-slate-950">{node?.type || 'Page design'}{part ? ` · ${part}` : ''}</h2><p className="mt-1 text-xs text-slate-600">{selection.viewport} settings · {block?.protected ? 'Protected functional component' : 'Independent component overrides'}</p></div>
        <div className="flex flex-wrap gap-1" aria-label="Inspector tabs">{['content', 'design', ...(mode === 'advanced' ? ['advanced'] : [])].map(name => <button key={name} type="button" aria-pressed={tab === name} className={`min-h-11 rounded-lg px-3 text-sm ${tab === name ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100'}`} onClick={() => setTab(name)}>{labelFor(name)}</button>)}</div>
        {mode === 'quick' && node && Object.values(theme.siteBuilder.stylePresets).some(preset => preset.blockTypes.includes(node.type)) && <label className="grid gap-1 text-xs font-semibold">Style preset<select className={inputClass} value={node.stylePresetId || ''} onChange={event => command({ kind: 'applyPreset', nodeId: selection.nodeId, presetId: event.target.value })}><option value="" disabled>Select a compatible preset</option>{Object.entries(theme.siteBuilder.stylePresets).filter(([, preset]) => preset.blockTypes.includes(node.type)).map(([id, preset]) => <option key={id} value={id}>{preset.name}</option>)}</select><span className="font-normal text-slate-600">Applies to this component. Explicit overrides remain stronger.</span></label>}
        {tab === 'content' && <div className="grid gap-4">
            {!node && <p className="text-sm text-slate-600">Select a section, block or protected global core to edit its content.</p>}
            {node?.type === 'content.text' && <><DraftField label="Text" multiline={node.content.kind !== 'heading'} value={node.content.text} maxLength={6000} onChange={v => content('text', v)} /><label className="grid gap-1 text-xs font-semibold">Text kind<select className={inputClass} value={node.content.kind || 'paragraph'} onChange={e => content('kind', e.target.value)}><option value="paragraph">Paragraph</option><option value="heading">Heading</option></select></label></>}
            {node?.type === 'content.link' && <LinkContent node={node} content={content} />}
            {node?.type === 'content.image' && <><label className="grid gap-1 text-xs font-semibold">Store image<select className={inputClass} value={node.content.assetId} onChange={e => content('assetId', e.target.value)}><option value="" disabled>Select an available store image</option>{assets.map(asset => <option key={asset.assetId} value={asset.assetId}>{asset.name || asset.assetId}</option>)}</select></label><DraftField label="Image description" value={node.content.alt} maxLength={300} onChange={v => content('alt', v)} />{onUpload && <label className="grid gap-1 text-xs font-semibold">Upload store image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={e => onUpload(e, asset => content('assetId', String(asset.assetId)))} /></label>}</>}
            {node?.source && <><DraftField label="Catalog item count" type="number" value={node.source.limit || node.source.productIds?.length} min={1} max={node.type === 'catalog.categories' ? 12 : 24} encode={Number} onChange={limit => command({ kind: 'source', nodeId: selection.nodeId, source: { kind: node.type === 'catalog.categories' ? 'categories' : 'catalog', limit } })} />{node.type === 'catalog.products' && <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Manual selection (up to 24 public products)</legend>{products.slice(0, 100).map(product => <label key={product._id} className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={node.source.productIds?.includes(String(product._id)) || false} onChange={e => { const ids = new Set(node.source.productIds || []); if (e.target.checked) ids.add(String(product._id)); else ids.delete(String(product._id)); command({ kind: 'source', nodeId: selection.nodeId, source: ids.size ? { kind: 'manualProducts', productIds: [...ids] } : { kind: 'catalog', limit: 6 } }); }} />{product.title}</label>)}</fieldset>}</>}
            {block?.protected && <><p className="text-sm text-slate-600">Required commerce, identity, navigation and policy data remain controlled by existing store settings and authorized controllers. Use Design to edit registered presentation parts.</p>{tree.pageKind === 'footer' && onRootChange && <DraftField label="Footer description" value={theme.footer?.text || ''} maxLength={1000} onChange={text => onRootChange({ ...theme, footer: { ...theme.footer, text } })} />}{tree.pageKind === 'header' && onRootChange && <label className="grid gap-1 text-xs font-semibold">Header logo<select className={inputClass} value={theme.logoUrl || ''} onChange={e => onRootChange({ ...theme, logoUrl: e.target.value })}><option value="">Store name / initials</option>{theme.logoUrl && !assets.some(asset => asset.url === theme.logoUrl) && <option value={theme.logoUrl}>Current store logo</option>}{assets.map(asset => <option key={asset.assetId} value={asset.url}>{asset.name || asset.assetId}</option>)}</select></label>}</>}
            {block?.protected && tree.pageKind === 'header' && onRootChange && (getStorefrontPresentationVariant(theme) === 'atelier-editorial'
                ? <p className="text-xs text-slate-600">Atelier owns its masthead composition. Registered typography, colors and spacing remain editable.</p>
                : <label className="grid gap-1 text-xs font-semibold">Header composition<select className={inputClass} value={theme.header?.variant || 'standard'} onChange={event => onRootChange({ ...theme, header: { ...theme.header, variant: event.target.value } })}>{['standard', 'minimal', 'centered'].map(value => <option key={value}>{value}</option>)}</select></label>)}
            {block?.protected && tree.pageKind === 'footer' && onRootChange && <>
                <DraftField label="Contact link text" value={theme.footer?.contactLabel || ''} maxLength={120} onChange={contactLabel => onRootChange({ ...theme, footer: { ...theme.footer, contactLabel } })} />
                <DraftField label="Contact email" value={theme.footer?.contactEmail || ''} type="email" maxLength={254} onChange={contactEmail => onRootChange({ ...theme, footer: { ...theme.footer, contactEmail } })} />
                <p className="text-xs text-slate-600">Existing navigation, social links and automatic policy links are retained. Column composition is controlled by the selected theme.</p>
            </>}
            {node?.slots && <p className="text-sm text-slate-600">Select a nested heading, image or link from the structure tree or live preview. Layout presets add compatible blocks without replacing existing content.</p>}
        </div>}
        {tab !== 'content' && <div className="grid gap-4">
            {node && Object.keys(block.parts).length > 0 && <label className="grid gap-1 text-xs font-semibold">Semantic part<select className={inputClass} value={part || ''} onChange={e => onSelectPart(e.target.value || null)}><option value="">Whole component</option>{Object.keys(block.parts).map(name => <option key={name}>{name}</option>)}</select></label>}
            <p className={`rounded-lg p-3 text-xs ${contrastRatio(foreground, background) < 4.5 ? 'bg-amber-100 text-amber-950' : 'bg-emerald-50 text-emerald-900'}`}>Known text/surface contrast: {contrastRatio(foreground, background).toFixed(2)}:1. Nested surfaces are validated separately.</p>
            {controls.map(property => <div key={property} data-adaptive-control={property} className="grid gap-2 rounded-lg border border-slate-200 p-3"><StyleControl key={`${property}/${resetEpoch}`} property={property} value={resolved?.[property]} functional={!node || block.protected} onChange={value => style(property, value)} onAuto={() => reset(property)} /><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-slate-500">{styleOrigin(theme, selection, property)}</span><button type="button" className="min-h-11 font-semibold text-indigo-700" onClick={() => reset(property)}>Reset {labelFor(property)}</button></div></div>)}
            <button type="button" className="min-h-11 rounded-lg border border-slate-300 text-sm" onClick={() => reset()}>Reset {selection.viewport} overrides</button>
            {node && <button type="button" className="min-h-11 rounded-lg border border-slate-300 text-sm" onClick={() => command({ kind: 'resetSectionStyles', nodeId: selection.nodeId })}>Reset section styles and preset</button>}
            {!node && <button type="button" className="min-h-11 rounded-lg border border-slate-300 text-sm" onClick={() => command({ kind: 'resetPageStyles' })}>Reset page styles</button>}
            {block?.protected && <p className="text-xs leading-5 text-slate-600">Required structure and functional controls are code-owned. Only registered presentation settings are available. Optional sections follow the protected core; content before the core is unsupported by blueprint v1.</p>}
        </div>}
        {mode === 'advanced' && node && <fieldset className="grid gap-2 border-t border-slate-200 pt-4"><legend className="pt-4 text-sm font-semibold">Reusable design</legend><label className="grid gap-1 text-xs">Design name<input className={inputClass} value={libraryName} maxLength={80} onChange={e => setLibraryName(e.target.value)} /></label>{!block.protected && <button type="button" className="min-h-11 rounded-lg bg-slate-100 text-sm" onClick={() => command({ kind: 'saveSection', nodeId: selection.nodeId, savedSectionId: freshDesignId(theme.siteBuilder, 'saved'), name: libraryName })}>Save section copy</button>}<button type="button" className="min-h-11 rounded-lg bg-slate-100 text-sm" onClick={() => command({ kind: 'savePreset', nodeId: selection.nodeId, presetId: freshDesignId(theme.siteBuilder, 'preset'), name: libraryName })}>Create style preset</button>{Object.entries(theme.siteBuilder.stylePresets).filter(([, preset]) => preset.blockTypes.includes(node.type)).map(([id, preset]) => <div className="rounded-lg border border-slate-200 p-3" key={id}><p className="text-sm font-semibold">{preset.name}</p><p className="my-1 break-words text-xs text-slate-600">Properties: {[...Object.values(preset.styles || {}).flatMap(Object.keys), ...Object.keys(preset.partStyles || {})].join(', ') || 'Theme defaults'}. Used by {Object.values(theme.siteBuilder.templates).flatMap(tree => Object.values(tree.nodes)).filter(item => item.stylePresetId === id).length} nodes.</p><button type="button" className="min-h-11 text-sm text-indigo-700" onClick={() => command({ kind: 'applyPreset', nodeId: selection.nodeId, presetId: id })}>Apply {preset.name}</button><button type="button" className="ml-3 min-h-11 text-sm text-rose-700" onClick={() => command({ kind: 'deletePreset', presetId: id })}>Delete unused preset</button></div>)}</fieldset>}
        {mode === 'advanced' && node && <p className="text-xs text-slate-600">Applying a preset affects only this component. Explicit overrides take precedence; reset an individual override to inherit the preset.</p>}
    </section>;
}
