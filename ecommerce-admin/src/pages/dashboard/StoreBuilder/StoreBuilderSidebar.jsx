import { getThemeCapabilities, getThemeEditorRestriction } from '@scaleup/storefront-theme';
import { useMemo, useState } from 'react';
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    LockKeyhole,
    Search,
    Trash2,
    X
} from 'lucide-react';
import {
    builderSectionItems,
    getSectionSelectionId,
    isHomepageSectionLocked,
    seoStatusItem,
    themeSettingItems
} from './storeBuilderConstants.jsx';

const DESIGN_SETTING_IDS = new Set(['brand', 'colors', 'typography', 'layout', 'mobile']);
const EXPERIENCE_SETTING_IDS = new Set(['checkout', 'policies']);
const EMPTY_SECTIONS = [];

const matchesSearch = (item, search) => {
    if (!search) return true;

    return [item?.label, item?.description, item?.id, item?.group]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(search));
};

const cx = (...classes) => classes.filter(Boolean).join(' ');

const LockBadge = ({ lockedByPlan }) => (
    <span
        className={cx(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5',
            'text-[10px] font-bold uppercase tracking-[0.08em]',
            lockedByPlan
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-slate-50 text-slate-500'
        )}
    >
        <LockKeyhole size={10} aria-hidden="true" />
        {lockedByPlan ? 'Plan' : 'Fixed'}
    </span>
);

const NavigationRow = ({ item, active, lockedByPlan, onSelect }) => {
    const Icon = item.icon;
    const isLocked = item.locked || lockedByPlan;

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-current={active ? 'page' : undefined}
            className={cx(
                'group relative flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left',
                'outline-none transition-all duration-150',
                'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
                active
                    ? 'bg-indigo-50 text-indigo-950 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.14)]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            )}
        >
            <span
                aria-hidden="true"
                className={cx(
                    'absolute inset-y-2 left-0 w-0.5 rounded-full bg-indigo-600 transition-opacity',
                    active ? 'opacity-100' : 'opacity-0'
                )}
            />

            <span
                className={cx(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                    active
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100'
                        : 'bg-slate-100/80 text-slate-400 group-hover:bg-white group-hover:text-slate-600 group-hover:shadow-sm'
                )}
            >
                <Icon size={16} aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1 pt-0.5">
                <span className="flex min-w-0 items-center gap-2">
                    <span className={cx('truncate text-sm font-semibold', active && 'text-indigo-900')}>
                        {item.label}
                    </span>
                    {isLocked && <LockBadge lockedByPlan={lockedByPlan} />}
                </span>

                {item.description && (
                    <span
                        className={cx(
                            'mt-0.5 block overflow-hidden text-xs leading-4 transition-all',
                            active ? 'max-h-10 text-indigo-700/70' : 'max-h-0 text-slate-400 opacity-0'
                        )}
                    >
                        {item.description}
                    </span>
                )}
            </span>

            <ChevronRight
                size={15}
                aria-hidden="true"
                className={cx(
                    'mt-2 shrink-0 transition-all',
                    active
                        ? 'translate-x-0 text-indigo-500 opacity-100'
                        : '-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                )}
            />
        </button>
    );
};

const NavigationGroup = ({ title, description, children }) => (
    <section className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
        <div className="mb-1.5 px-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</h2>
            {description && <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{description}</p>}
        </div>
        <div className="space-y-1">{children}</div>
    </section>
);

const ActionButton = ({ label, disabled, destructive = false, onClick, children }) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={cx(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg border outline-none transition',
            'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-30',
            destructive
                ? 'border-transparent text-rose-600 hover:border-rose-100 hover:bg-rose-50'
                : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm'
        )}
    >
        {children}
    </button>
);

const SectionStatus = ({ hidden, issueCount }) => (
    <span className="mt-1 flex flex-wrap items-center gap-1.5">
        {hidden && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Hidden
            </span>
        )}

        {issueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-100">
                <AlertCircle size={10} aria-hidden="true" />
                {issueCount} issue{issueCount === 1 ? '' : 's'}
            </span>
        )}
    </span>
);

const DynamicSectionRow = ({
                               section,
                               index,
                               totalSections,
                               selected,
                               locked,
                               issueCount,
                               canEditStructure,
                               onSelect,
                               onMoveSection,
                               onDuplicateSection,
                               onToggleSectionVisibility,
                               onRemoveSection
                           }) => {
    const hidden = section.isEnabled === false;
    const label = section.settings?.visualLabel || section.title || section.type;

    return (
        <div
            className={cx(
                'group rounded-xl border transition-all duration-150',
                selected
                    ? 'border-indigo-200 bg-indigo-50/80 shadow-sm'
                    : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50/80'
            )}
        >
            <button
                type="button"
                onClick={onSelect}
                aria-current={selected ? 'true' : undefined}
                className={cx(
                    'flex min-h-12 w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left outline-none',
                    'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
                )}
            >
                <span
                    className={cx(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 transition',
                        hidden
                            ? 'bg-slate-300 ring-slate-100'
                            : selected
                                ? 'bg-indigo-500 ring-indigo-100'
                                : 'bg-emerald-500 ring-emerald-50'
                    )}
                    aria-hidden="true"
                />

                <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                        <span className={cx('truncate text-sm font-semibold', selected ? 'text-indigo-950' : 'text-slate-800')}>
                            {label}
                        </span>
                        {locked && (
                            <span
                                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100"
                                aria-label="Fixed section"
                                title="This section is fixed"
                            >
                                <LockKeyhole size={11} aria-hidden="true" />
                            </span>
                        )}
                    </span>

                    <span className="mt-0.5 block truncate text-[11px] font-medium capitalize text-slate-400">
                        {String(section.type || '').replaceAll('-', ' ')}
                    </span>
                    <SectionStatus hidden={hidden} issueCount={issueCount} />
                </span>
            </button>

            {selected && !locked && (
                <div className="mx-2 mb-2 flex items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-white/75 px-1.5 py-1 backdrop-blur-sm">
                    <div className="flex items-center gap-0.5">
                        <ActionButton
                            label="Move section up"
                            disabled={!canEditStructure || index === 0}
                            onClick={() => onMoveSection?.(index, -1)}
                        >
                            <ChevronUp size={14} aria-hidden="true" />
                        </ActionButton>
                        <ActionButton
                            label="Move section down"
                            disabled={!canEditStructure || index === totalSections - 1}
                            onClick={() => onMoveSection?.(index, 1)}
                        >
                            <ChevronDown size={14} aria-hidden="true" />
                        </ActionButton>
                        <ActionButton
                            label="Duplicate section"
                            disabled={!canEditStructure}
                            onClick={() => onDuplicateSection?.(index)}
                        >
                            <Copy size={14} aria-hidden="true" />
                        </ActionButton>
                        <ActionButton
                            label={hidden ? 'Show section' : 'Hide section'}
                            onClick={() => onToggleSectionVisibility?.(index, hidden)}
                        >
                            {hidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                        </ActionButton>
                    </div>

                    <ActionButton
                        label="Delete section"
                        destructive
                        disabled={!canEditStructure}
                        onClick={() => onRemoveSection?.(index)}
                    >
                        <Trash2 size={14} aria-hidden="true" />
                    </ActionButton>
                </div>
            )}
        </div>
    );
};

const SeoScoreBadge = ({ score = 0 }) => {
    const tone = score >= 80
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
        : score >= 50
            ? 'bg-amber-50 text-amber-700 ring-amber-100'
            : 'bg-rose-50 text-rose-700 ring-rose-100';

    return (
        <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ring-inset', tone)}>
            {score}/100
        </span>
    );
};

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
    const capabilities = getThemeCapabilities(theme, planAccess);
    const [navigationSearch, setNavigationSearch] = useState('');
    const [sectionsExpanded, setSectionsExpanded] = useState(true);

    const search = navigationSearch.trim().toLowerCase();
    const dynamicSections = theme?.homepageSections || EMPTY_SECTIONS;

    const sectionsIndex = builderSectionItems.findIndex(item => item.id === 'sections');
    const sectionsItem = sectionsIndex >= 0 ? builderSectionItems[sectionsIndex] : null;

    const { beforeSections, afterSections } = useMemo(() => {
        const visibleItems = builderSectionItems
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.id !== 'sections' && matchesSearch(item, search));

        return {
            beforeSections: visibleItems.filter(({ index }) => sectionsIndex < 0 || index < sectionsIndex).map(({ item }) => item),
            afterSections: visibleItems.filter(({ index }) => sectionsIndex >= 0 && index > sectionsIndex).map(({ item }) => item)
        };
    }, [search, sectionsIndex]);

    const matchingDynamicSections = useMemo(
        () => dynamicSections
            .map((section, index) => ({ section, index }))
            .filter(({ section }) => matchesSearch(sectionsItem, search) || matchesSearch({
                label: section.settings?.visualLabel || section.title || section.type,
                description: section.type
            }, search)),
        [dynamicSections, search, sectionsItem]
    );

    const issueCounts = useMemo(() => {
        const counts = new Map();

        validation.forEach(issue => {
            const match = String(issue.path || '').match(/^homepageSections\.(\d+)/);
            if (!match) return;

            const index = Number(match[1]);
            counts.set(index, (counts.get(index) || 0) + 1);
        });

        return counts;
    }, [validation]);

    const settingGroups = useMemo(() => ({
        design: themeSettingItems.filter(item => DESIGN_SETTING_IDS.has(item.id) && matchesSearch(item, search)),
        experience: themeSettingItems.filter(item => EXPERIENCE_SETTING_IDS.has(item.id) && matchesSearch(item, search))
    }), [search]);

    const showDynamicSections = !search || matchesSearch(sectionsItem, search) || matchingDynamicSections.length > 0;
    const showSeo = matchesSearch(seoStatusItem, search);
    const hasLayoutResults = beforeSections.length > 0 || showDynamicSections || afterSections.length > 0;
    const hasResults = hasLayoutResults || settingGroups.design.length > 0 || settingGroups.experience.length > 0 || showSeo;
    const canEditStructure = Boolean(capabilities.sectionStructure.editable);

    const renderSetting = item => {
        const lockedByPlan = Boolean(getThemeEditorRestriction(item.group, { theme, planAccess }));

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

    const renderLayoutItem = item => (
        <NavigationRow
            key={item.id}
            item={item}
            active={activeElement === item.target || item.relatedTargets?.includes(activeElement)}
            onSelect={() => selectEditorTarget(item.target)}
        />
    );

    return (
        <aside
            id="builder-workspace-structure"
            tabIndex={-1}
            aria-label="Store structure and theme settings"
            className={cx(
                mobileWorkspace === 'structure' ? 'block' : 'hidden',
                'min-w-0 xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-7rem)] xl:self-start'
            )}
        >
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-3.5 pb-3 pt-3.5">
                    <div className="mb-3 flex items-start justify-between gap-3 px-0.5">
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-slate-950">Store builder</h1>
                            <p className="mt-0.5 text-xs leading-4 text-slate-500">
                                Structure, design and storefront settings
                            </p>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-indigo-600 ring-1 ring-inset ring-indigo-100">
                            Editor
                        </span>
                    </div>

                    <label className="group relative block">
                        <span className="sr-only">Find Store Builder settings</span>
                        <Search
                            size={16}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500"
                        />
                        <input
                            type="search"
                            value={navigationSearch}
                            onChange={event => setNavigationSearch(event.target.value)}
                            placeholder="Search sections and settings..."
                            className={cx(
                                'min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 shadow-sm outline-none transition',
                                'placeholder:text-slate-400 hover:border-slate-300',
                                'focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10'
                            )}
                        />
                        {navigationSearch && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                title="Clear search"
                                onClick={() => setNavigationSearch('')}
                                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 outline-none transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        )}
                    </label>
                </div>

                <div className="max-h-[calc(100vh-15rem)] overflow-y-auto overscroll-contain px-2.5 py-3 [scrollbar-gutter:stable]">
                    {!hasResults ? (
                        <div className="mx-0.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
                            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                                <Search size={16} aria-hidden="true" />
                            </span>
                            <p className="mt-3 text-sm font-semibold text-slate-700">No matching settings</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                Try a section name, design setting, or “SEO”.
                            </p>
                            <button
                                type="button"
                                onClick={() => setNavigationSearch('')}
                                className="mt-3 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 outline-none transition hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <nav className="space-y-4" aria-label="Store Builder">
                            {hasLayoutResults && (
                                <NavigationGroup title="Store layout" description="Arrange what shoppers see on your storefront.">
                                    {beforeSections.map(renderLayoutItem)}

                                    {showDynamicSections && (
                                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40">
                                            <div className="flex items-center gap-1 p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => selectEditorTarget('sections')}
                                                    aria-current={activeElement === 'sections' ? 'page' : undefined}
                                                    className={cx(
                                                        'flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 text-left outline-none transition',
                                                        'focus-visible:ring-2 focus-visible:ring-indigo-500',
                                                        activeElement === 'sections'
                                                            ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                                                            : 'text-slate-700 hover:bg-white/80'
                                                    )}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-semibold">Homepage sections</span>
                                                        <span className="block text-[11px] text-slate-400">Reusable content blocks</span>
                                                    </span>
                                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-500">
                                                        {dynamicSections.length}
                                                    </span>
                                                </button>

                                                <button
                                                    type="button"
                                                    aria-label={sectionsExpanded || search ? 'Collapse homepage sections' : 'Expand homepage sections'}
                                                    title={search ? 'Clear search to collapse sections' : sectionsExpanded ? 'Collapse sections' : 'Expand sections'}
                                                    aria-expanded={Boolean(sectionsExpanded || search)}
                                                    disabled={Boolean(search)}
                                                    onClick={() => setSectionsExpanded(value => !value)}
                                                    className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 outline-none transition hover:bg-white hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500"
                                                >
                                                    <ChevronDown
                                                        size={15}
                                                        aria-hidden="true"
                                                        className={cx('transition-transform duration-200', !sectionsExpanded && '-rotate-90')}
                                                    />
                                                </button>
                                            </div>

                                            {(sectionsExpanded || Boolean(search)) && (
                                                <div className="space-y-1 border-t border-slate-200/70 bg-white p-1.5">
                                                    {matchingDynamicSections.length > 0 ? (
                                                        matchingDynamicSections.map(({ section, index }) => {
                                                            const selectionId = getSectionSelectionId(section, index);
                                                            const selected = activeElement === selectionId;
                                                            const locked = isHomepageSectionLocked(section) || !capabilities.sections[section.type]?.editable;

                                                            return (
                                                                <DynamicSectionRow
                                                                    key={section.id || section._id || index}
                                                                    section={section}
                                                                    index={index}
                                                                    totalSections={dynamicSections.length}
                                                                    selected={selected}
                                                                    locked={locked}
                                                                    issueCount={issueCounts.get(index) || 0}
                                                                    canEditStructure={canEditStructure}
                                                                    onSelect={() => selectEditorTarget(selectionId)}
                                                                    onMoveSection={onMoveSection}
                                                                    onDuplicateSection={onDuplicateSection}
                                                                    onToggleSectionVisibility={onToggleSectionVisibility}
                                                                    onRemoveSection={onRemoveSection}
                                                                />
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                                                            No homepage sections match your search.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {afterSections.map(renderLayoutItem)}
                                </NavigationGroup>
                            )}

                            {settingGroups.design.length > 0 && (
                                <NavigationGroup title="Brand & design" description="Control your visual identity and presentation.">
                                    {settingGroups.design.map(renderSetting)}
                                </NavigationGroup>
                            )}

                            {settingGroups.experience.length > 0 && (
                                <NavigationGroup title="Store experience" description="Configure shopper-facing behavior.">
                                    {settingGroups.experience.map(renderSetting)}
                                </NavigationGroup>
                            )}

                            {showSeo && (
                                <NavigationGroup title="More tools">
                                    <a
                                        href="/dashboard/seo"
                                        className={cx(
                                            'group flex min-h-12 items-start gap-3 rounded-xl px-3 py-2.5 text-slate-600 outline-none transition-all',
                                            'hover:bg-slate-50 hover:text-slate-950',
                                            'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
                                        )}
                                    >
                                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition group-hover:bg-white group-hover:text-slate-600 group-hover:shadow-sm">
                                            <seoStatusItem.icon size={16} aria-hidden="true" />
                                        </span>

                                        <span className="min-w-0 flex-1 pt-0.5">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold">Homepage SEO</span>
                                                <SeoScoreBadge score={seoHealth?.score || 0} />
                                            </span>
                                            <span className="mt-0.5 block text-xs leading-4 text-slate-400">
                                                Improve search visibility and sharing
                                            </span>
                                        </span>

                                        <ChevronRight
                                            size={15}
                                            aria-hidden="true"
                                            className="mt-2 -translate-x-1 text-slate-300 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                                        />
                                    </a>
                                </NavigationGroup>
                            )}
                        </nav>
                    )}
                </div>
            </div>
        </aside>
    );
}
