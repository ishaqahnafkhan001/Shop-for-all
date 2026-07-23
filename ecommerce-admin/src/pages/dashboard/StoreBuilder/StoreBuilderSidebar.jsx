import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, LockKeyhole, Trash2 } from 'lucide-react';
import {
    builderSectionItems,
    getSectionSelectionId,
    isHomepageSectionLocked,
    seoStatusItem,
    themeSettingItems
} from './storeBuilderConstants.jsx';

const NavigationRow = ({ item, active, lockedByPlan, onSelect }) => {
    const Icon = item.icon;
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
        >
            <Icon size={18} className={active ? 'mt-0.5 text-indigo-600' : 'mt-0.5 text-slate-400'} aria-hidden="true" />
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                    {item.label}
                    {(item.locked || lockedByPlan) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                            <LockKeyhole size={10} /> {lockedByPlan ? 'Plan' : 'Fixed'}
                        </span>
                    )}
                </span>
                <span className="mt-0.5 block text-xs leading-4 opacity-75">{item.description}</span>
            </span>
        </button>
    );
};

export function StoreBuilderSidebar({
    mobileWorkspace,
    activeElement,
    activeGroup,
    navigationMode,
    onNavigationModeChange,
    selectEditorTarget,
    selectSettingsGroup,
    planAccess,
    theme,
    validation = [],
    seoHealth,
    onMoveSection,
    onDuplicateSection,
    onToggleSectionVisibility,
    onRemoveSection
}) {
    const mode = navigationMode || 'sections';
    const dynamicSections = theme?.homepageSections || [];
    const fixedItems = builderSectionItems.filter(item => item.id !== 'sections');

    return (
        <aside className={`${mobileWorkspace === 'structure' ? 'block' : 'hidden'} min-w-0 xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto`}>
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <div className="mb-2 grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Store Builder navigation mode">
                    {[
                        ['sections', 'Sections'],
                        ['theme', 'Theme settings']
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={mode === id}
                            onClick={() => onNavigationModeChange?.(id)}
                            className={`min-h-10 rounded-md px-3 py-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {mode === 'sections' ? (
                    <div className="space-y-1" role="tabpanel">
                        <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400">Homepage</p>
                        {fixedItems.slice(0, 2).map(item => (
                            <NavigationRow
                                key={item.id}
                                item={item}
                                active={activeElement === item.target || item.relatedTargets?.includes(activeElement)}
                                onSelect={() => selectEditorTarget(item.target)}
                            />
                        ))}

                        <div className="mt-2 border-y border-slate-100 py-2">
                            <button
                                type="button"
                                onClick={() => selectEditorTarget('sections')}
                                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 ${activeElement === 'sections' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                            >
                                <span>Dynamic sections</span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{dynamicSections.length}</span>
                            </button>
                            <div className="mt-1 space-y-1 pl-3">
                                {dynamicSections.map((section, index) => {
                                    const selectionId = getSectionSelectionId(section, index);
                                    const selected = activeElement === selectionId;
                                    const locked = isHomepageSectionLocked(section);
                                    const issueCount = validation.filter(issue => String(issue.path || '').startsWith(`homepageSections.${index}`)).length;
                                    return (
                                        <div key={section.id || section._id || index} className={`rounded-lg border p-2 ${selected ? 'border-indigo-200 bg-indigo-50' : 'border-transparent hover:border-slate-200'}`}>
                                            <button type="button" onClick={() => selectEditorTarget(selectionId)} className="flex min-h-10 w-full items-start justify-between gap-2 rounded-md px-1 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-bold text-slate-800">{section.settings?.visualLabel || section.title || section.type}</span>
                                                    <span className="mt-0.5 flex flex-wrap gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                        <span>{section.type}</span>
                                                        <span>{section.desktopSettings?.isVisible === false ? 'Desktop hidden' : 'Desktop'}</span>
                                                        <span>{section.mobileSettings?.isVisible === false ? 'Mobile hidden' : 'Mobile'}</span>
                                                        {issueCount > 0 && <span className="text-red-600">{issueCount} issue{issueCount === 1 ? '' : 's'}</span>}
                                                    </span>
                                                </span>
                                                {locked && <LockKeyhole size={14} className="mt-1 shrink-0 text-amber-600" aria-label="Fixed section" />}
                                            </button>
                                            {!locked && (
                                                <div className="mt-1 flex flex-wrap gap-1 border-t border-slate-200/70 pt-1">
                                                    <button type="button" aria-label="Move section up" title="Move up" disabled={index === 0} onClick={() => onMoveSection?.(index, -1)} className="rounded-md p-2 text-slate-500 hover:bg-white disabled:opacity-30"><ChevronUp size={14} /></button>
                                                    <button type="button" aria-label="Move section down" title="Move down" disabled={index === dynamicSections.length - 1} onClick={() => onMoveSection?.(index, 1)} className="rounded-md p-2 text-slate-500 hover:bg-white disabled:opacity-30"><ChevronDown size={14} /></button>
                                                    <button type="button" aria-label="Duplicate section" title="Duplicate" onClick={() => onDuplicateSection?.(index)} className="rounded-md p-2 text-slate-500 hover:bg-white"><Copy size={14} /></button>
                                                    <button type="button" aria-label={section.isEnabled === false ? 'Show section' : 'Hide section'} title={section.isEnabled === false ? 'Show' : 'Hide'} onClick={() => onToggleSectionVisibility?.(index, section.isEnabled === false)} className="rounded-md p-2 text-slate-500 hover:bg-white">{section.isEnabled === false ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                                                    <button type="button" aria-label="Delete section" title="Delete" onClick={() => onRemoveSection?.(index)} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {fixedItems.slice(2).map(item => (
                            <NavigationRow
                                key={item.id}
                                item={item}
                                active={activeElement === item.target || item.relatedTargets?.includes(activeElement)}
                                onSelect={() => selectEditorTarget(item.target)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1" role="tabpanel">
                        {themeSettingItems.map(item => {
                            const lockedByPlan = planAccess?.storeBuilderAccess !== 'full' && (
                                ['layout', 'mobile'].includes(item.id) ||
                                (item.id === 'domain' && planAccess?.features?.customDomain === false)
                            );
                            return (
                                <NavigationRow
                                    key={item.id}
                                    item={item}
                                    active={activeElement === item.target || activeGroup === item.group}
                                    lockedByPlan={lockedByPlan}
                                    onSelect={() => selectSettingsGroup(item.group)}
                                />
                            );
                        })}
                        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                            <div className="flex items-start gap-3">
                                {seoStatusItem?.icon && <seoStatusItem.icon size={18} className="mt-0.5 text-indigo-600" />}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-slate-950">Homepage SEO</p>
                                    <p className="mt-1 text-xs text-slate-600">Health {seoHealth?.score || 0}/100 · {seoHealth?.missing?.length || 0} open issues</p>
                                    <a href="/dashboard/seo" className="mt-2 inline-flex min-h-10 items-center text-sm font-black text-indigo-700 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500">Manage SEO</a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
