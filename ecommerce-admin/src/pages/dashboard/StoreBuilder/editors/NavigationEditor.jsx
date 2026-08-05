import { ChevronDown, ChevronUp, GripVertical, Link, Plus, Trash2, Upload } from 'lucide-react';
import { BuilderButton, BuilderCard, BuilderInput, BuilderSelect, BuilderToggle, inputClass } from '../builderUi.jsx';
import { headerVariantOptions } from '../storeBuilderConstants.jsx';

export function NavigationEditor({
    theme,
    setTheme,
    uploadingLogo,
    onLogoUpload,
    addNavigation,
    addNavigationDropdown,
    moveNavigation,
    removeNavigation,
    updateNavigation,
    addNavigationChild,
    updateNavigationChild,
    removeNavigationChild,
    advancedDesignEnabled = false
}) {
    return (
        <BuilderCard
            title="Header and navigation"
            description="Keep navigation short so customers can find the important pages quickly."
            icon={Link}
            actions={<div className="flex flex-wrap gap-2"><BuilderButton type="button" variant="secondary" onClick={addNavigation}><Plus size={16} /> Add link</BuilderButton><BuilderButton type="button" variant="secondary" onClick={addNavigationDropdown}><Plus size={16} /> Add dropdown</BuilderButton></div>}
        >
            <BuilderSelect
                label="Header layout"
                value={theme.header?.variant || 'standard'}
                onChange={event => setTheme(previous => ({ ...previous, header: { ...(previous.header || {}), variant: event.target.value } }))}
                disabled={!advancedDesignEnabled}
                help={advancedDesignEnabled ? 'Changes the desktop composition while keeping the same navigation and mobile drawer.' : 'Structural layouts require full Store Builder access.'}
            >
                {headerVariantOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </BuilderSelect>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Store logo</p>
                <BuilderInput label="Logo URL" value={theme.logoUrl || ''} onChange={event => setTheme(previous => ({ ...previous, logoUrl: event.target.value }))} placeholder="https://..." help="Paste a public image URL or upload a logo file." />
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                    <Upload size={16} />{uploadingLogo ? 'Uploading...' : 'Upload storefront logo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={event => onLogoUpload(event, 'storefront')} />
                </label>
            </div>
            {(theme.navigation || []).map((item, index) => (
                <div key={`${item.label || 'navigation'}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"><GripVertical size={15} />Link {index + 1}</div>
                        <div className="flex items-center gap-1">
                            <button type="button" aria-label="Move link up" onClick={() => moveNavigation(index, -1)} disabled={index === 0} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronUp size={16} /></button>
                            <button type="button" aria-label="Move link down" onClick={() => moveNavigation(index, 1)} disabled={index === (theme.navigation || []).length - 1} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronDown size={16} /></button>
                            <button type="button" aria-label="Delete link" onClick={() => removeNavigation(index)} className="rounded-md p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <BuilderInput label="Label" value={item.label || ''} onChange={event => updateNavigation(index, 'label', event.target.value)} placeholder="Shop" error={item.url && !item.label ? 'Add a label for this link.' : ''} />
                        <BuilderInput label="URL" value={item.url || ''} onChange={event => updateNavigation(index, 'url', event.target.value)} placeholder="/products" help="Use an internal path like /track or a full external URL." />
                        <BuilderToggle label="Mega menu ready" checked={Boolean(item.megaMenu)} onChange={() => updateNavigation(index, 'megaMenu', !item.megaMenu)} />
                    </div>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nested menu links</p><p className="text-xs text-slate-500">Prepared for dropdown and mega menu expansion.</p></div>
                            <BuilderButton type="button" variant="subtle" onClick={() => addNavigationChild(index)}><Plus size={14} /> Add sub link</BuilderButton>
                        </div>
                        {(item.children || []).length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">No sub links yet.</p> : (
                            <div className="space-y-2">{(item.children || []).map((child, childIndex) => (
                                <div key={`${child.label || 'sub-link'}-${childIndex}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                                    <input value={child.label || ''} onChange={event => updateNavigationChild(index, childIndex, 'label', event.target.value)} placeholder="Sub label" className={inputClass} aria-label="Sub menu label" />
                                    <input value={child.url || ''} onChange={event => updateNavigationChild(index, childIndex, 'url', event.target.value)} placeholder="/collection" className={inputClass} aria-label="Sub menu URL" />
                                    <button type="button" aria-label="Delete sub link" onClick={() => removeNavigationChild(index, childIndex)} className="rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                                </div>
                            ))}</div>
                        )}
                    </div>
                </div>
            ))}
        </BuilderCard>
    );
}

export default NavigationEditor;
