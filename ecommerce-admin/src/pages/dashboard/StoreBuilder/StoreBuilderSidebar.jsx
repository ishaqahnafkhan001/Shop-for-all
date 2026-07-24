import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, LockKeyhole, Search, Trash2 } from 'lucide-react';
import {
    builderSectionItems,
    getSectionSelectionId,
    isHomepageSectionLocked,
    seoStatusItem,
    themeSettingItems
} from './storeBuilderConstants.jsx';

const matchesSearch = (item, search) => {
    if (!search) return true;
    return [item?.label, item?.description, item?.id, item?.group]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(search));
};

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
                {active && item.description && <span className="mt-0.5 block text-xs leading-4 opacity-75">{item.description}</span>}
            </span>
        </button>
    );
};

const NavigationGroup = ({ title, children }) => (
    <section className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
        <h2 className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{title}</h2>
        <div className="space-y-1">{children}</div>
    </section>
);

export function StoreBuilderSidebar({
    mobileWorkspace,
    activeElement,
    activeGroup,
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
    const [navigationSearch, setNavigationSearch] = useState('');
    const search = navigationSearch.trim().toLowerCase();
    const dynamicSections = theme?.homepageSections || [];
    const fixedItems = builderSectionItems.filter(item => item.id !== 'sections' && matchesSearch(item, search));
    const sectionsItem = builderSectionItems.find(item => item.id === 'sections');
    const matchingDynamicSections = dynamicSections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => matchesSearch({
            label: section.settings?.visualLabel || section.title || section.type,
            description: section.type
        }, search));

    const settingGroups = {
        design: themeSettingItems.filter(item => ['brand', 'colors', 'typography', 'layout', 'mobile'].includes(item.id) && matchesSearch(item, search)),
        experience: themeSettingItems.filter(item => ['checkout', 'policies'].includes(item.id) && matchesSearch(item, search)),
        connections: themeSettingItems.filter(item => item.id === 'domain' && matchesSearch(item, search))
    };
    const showDynamicSections = !search || matchesSearch(sectionsItem, search) || matchingDynamicSections.length > 0;
    const hasResults = fixedItems.length > 0 || showDynamicSections || Object.values(settingGroups).some(items => items.length > 0) || matchesSearch(seoStatusItem, search);

    const renderSetting = (item) => {
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
    };

    return (
        <aside className={`${mobileWorkspace === 'structure' ? 'block' : 'hidden'} min-w-0 xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto`}>
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <label className="relative mb-2 block">
                    <span className="sr-only">Find Store Builder settings</span>
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={navigationSearch}
                        onChange={event => setNavigationSearch(event.target.value)}
                        placeholder="Find a section or setting"
                        className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                </label>

                {!hasResults ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-500">
                        No Store Builder settings match “{navigationSearch}”.
                    </div>
                ) : (
                    <nav className="space-y-2" aria-label="Store Builder">
                        {(fixedItems.length > 0 || showDynamicSections) && (
                            <NavigationGroup title="Store layout">
                                {fixedItems.slice(0, 2).map(item => (
                                    <NavigationRow
                                        key={item.id}
                                        item={item}
                                        active={activeElement === item.target || item.relatedTargets?.includes(activeElement)}
                                        onSelect={() => selectEditorTarget(item.target)}
                                    />
                                ))}

                                {showDynamicSections && (
                                    <div className="rounded-lg border border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => selectEditorTarget('sections')}
                                            className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 ${activeElement === 'sections' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <span>Dynamic sections</span>
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{dynamicSections.length}</span>
                                        </button>
                                        <div className="space-y-1 px-2 pb-2">
                                            {matchingDynamicSections.map(({ section, index }) => {
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
                                                                    {section.isEnabled === false && <span>Hidden</span>}
                                                                    {issueCount > 0 && <span className="text-red-600">{issueCount} issue{issueCount === 1 ? '' : 's'}</span>}
                                                                </span>
                                                            </span>
                                                            {locked && <LockKeyhole size={14} className="mt-1 shrink-0 text-amber-600" aria-label="Fixed section" />}
                                                        </button>
                                                        {selected && !locked && (
                                                            <div className="mt-1 flex flex-wrap gap-1 border-t border-indigo-100 pt-1">
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
                                )}

                                {fixedItems.slice(2).map(item => (
                                    <NavigationRow
                                        key={item.id}
                                        item={item}
                                        active={activeElement === item.target || item.relatedTargets?.includes(activeElement)}
                                        onSelect={() => selectEditorTarget(item.target)}
                                    />
                                ))}
                            </NavigationGroup>
                        )}

                        {settingGroups.design.length > 0 && <NavigationGroup title="Brand and design">{settingGroups.design.map(renderSetting)}</NavigationGroup>}
                        {settingGroups.experience.length > 0 && <NavigationGroup title="Store experience">{settingGroups.experience.map(renderSetting)}</NavigationGroup>}
                        {(settingGroups.connections.length > 0 || matchesSearch(seoStatusItem, search)) && (
                            <NavigationGroup title="Connections">
                                {settingGroups.connections.map(renderSetting)}
                                {matchesSearch(seoStatusItem, search) && (
                                    <a href="/dashboard/seo" className="flex min-h-11 items-start gap-3 rounded-lg px-3 py-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <seoStatusItem.icon size={18} className="mt-0.5 text-slate-400" aria-hidden="true" />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                                                Homepage SEO
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{seoHealth?.score || 0}/100</span>
                                            </span>
                                            <span className="mt-0.5 block text-xs text-slate-500">Open the dedicated SEO workspace</span>
                                        </span>
                                    </a>
                                )}
                            </NavigationGroup>
                        )}
                    </nav>
                )}
            </div>
        </aside>
    );
}
