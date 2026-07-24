import { ChevronDown, Palette, Search } from 'lucide-react';
import {
    BuilderButton,
    BuilderCard,
    FieldShell,
    inputClass
} from '../builderUi.jsx';
import { colorGroups } from '../storeBuilderConstants.jsx';
import { defaultTheme, isHexColor } from '../storeBuilderThemeUtils.js';
import { colorPalettePresets, colorSectionGroups, getColorPathValue } from '../storeBuilderColorConfig.js';

export function ColorEditor({
    planAccess,
    theme,
    colorMode,
    setColorMode,
    colorSearch,
    setColorSearch,
    openColorSection,
    setOpenColorSection,
    advancedColorsOpen,
    setAdvancedColorsOpen,
    getThemeColor,
    getContrastWarning,
    setColorPath,
    setMainBrandColor,
    applyBrandColor,
    resetColorPalette,
    applyColorSet,
    resetColorGroup,
    setColor
}) {
    const fullColorControls = planAccess.storeBuilderCapabilities?.advancedDesign === true;
    const activeColorMode = fullColorControls ? colorMode : 'quick';
    const mainBrandColor = getThemeColor('brand.primary', theme.colors?.accent || defaultTheme.colors.accent);
    const searchTerm = colorSearch.trim().toLowerCase();
    const visibleGroups = colorSectionGroups
        .map(group => ({
            ...group,
            fields: group.fields.filter(field => (
                !searchTerm ||
                group.title.toLowerCase().includes(searchTerm) ||
                field.label.toLowerCase().includes(searchTerm) ||
                field.path.toLowerCase().includes(searchTerm)
            ))
        }))
        .filter(group => group.fields.length > 0);

    const renderNestedColorField = (field) => {
        const value = getColorPathValue(theme.colors, field.path) || getColorPathValue(defaultTheme.colors, field.path) || '';
        const invalid = value && !isHexColor(value);
        const contrastWarning = !invalid ? getContrastWarning(field) : '';

        return (
            <FieldShell
                key={field.path}
                label={field.label}
                help={field.help || field.path}
                error={invalid ? 'Enter a valid hex color, for example #0f766e.' : contrastWarning}
            >
                <div className="flex min-w-0 gap-2" data-field-path={`colors.${field.path}`}>
                    <input
                        type="color"
                        value={isHexColor(value) ? value : '#000000'}
                        onChange={event => setColorPath(field.path, event.target.value)}
                        className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                        aria-label={`${field.label} color picker`}
                    />
                    <input
                        value={value}
                        onChange={event => setColorPath(field.path, event.target.value)}
                        className={`${inputClass} min-w-0`}
                        placeholder="#0f766e"
                        aria-label={`${field.label} hex value`}
                    />
                </div>
            </FieldShell>
        );
    };

    return (
        <BuilderCard title="Colors" description="Choose a quick palette, customize each storefront section, or fine-tune advanced legacy colors." icon={Palette}>
            <div className={`grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black sm:text-sm ${fullColorControls ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {(fullColorControls ? [
                    ['quick', 'Quick Setup'],
                    ['sections', 'Section Colors'],
                    ['advanced', 'Advanced Colors']
                ] : [['quick', 'Quick Setup']]).map(([mode, label]) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => setColorMode(mode)}
                        className={`rounded-lg px-2 py-2 transition ${activeColorMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {!fullColorControls && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                    Starter includes quick brand colors and curated palettes. Section-by-section and advanced color controls are available on Growth and Pro.
                </div>
            )}

            {activeColorMode === 'quick' && (
                <div className="min-w-0 space-y-5">
                    <div className="grid min-w-0 gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4">
                        <div className="space-y-4">
                            <div className="flex min-w-0 flex-col gap-4">
                                <FieldShell
                                    label="Main brand color"
                                    help="Used for buttons, links, highlights, product actions, checkout accents, and hover states."
                                    error={!isHexColor(mainBrandColor) ? 'Enter a valid hex color, for example #0f766e.' : ''}
                                >
                                    <div className="flex min-w-0 gap-2" data-field-path="colors.brand.primary">
                                        <input
                                            type="color"
                                            value={isHexColor(mainBrandColor) ? mainBrandColor : defaultTheme.colors.accent}
                                            onChange={event => setMainBrandColor(event.target.value)}
                                            className="h-11 w-14 rounded-lg border border-slate-200 bg-white"
                                            aria-label="Main brand color picker"
                                        />
                                        <input
                                            value={mainBrandColor}
                                            onChange={event => setMainBrandColor(event.target.value)}
                                            className={`${inputClass} min-w-0`}
                                            placeholder="#0f766e"
                                            aria-label="Main brand color hex value"
                                        />
                                    </div>
                                </FieldShell>
                                <BuilderButton type="button" onClick={applyBrandColor} className="w-full">
                                    Apply brand color to storefront
                                </BuilderButton>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {['brand.primary', 'brand.hover', 'brand.soft', 'brand.ring', 'productCard.addToCartBackground', 'productCard.buyNowBackground', 'allProducts.paginationActiveBackground', 'footer.linkHover'].map(path => (
                                    <span
                                        key={path}
                                        title={path}
                                        className="h-9 rounded-lg border border-white shadow-sm ring-1 ring-slate-200"
                                        style={{ backgroundColor: getThemeColor(path, '#ffffff') }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Color palette preview">
                            <div className="px-4 py-3" style={{ backgroundColor: getThemeColor('header.background'), color: getThemeColor('header.text') }}>
                                <p className="text-sm font-black">Store preview</p>
                                <p className="text-xs" style={{ color: getThemeColor('header.mutedText') }}>Header and navigation</p>
                            </div>
                            <div className="p-4" style={{ backgroundColor: getThemeColor('allProducts.background') }}>
                                <div className="rounded-xl border p-3" style={{ backgroundColor: getThemeColor('productCard.background'), borderColor: getThemeColor('productCard.border') }}>
                                    <div className="mb-3 h-20 rounded-lg" style={{ backgroundColor: getThemeColor('brand.soft') }} />
                                    <p className="text-sm font-black" style={{ color: getThemeColor('productCard.title') }}>Product card title</p>
                                    <p className="mt-1 text-xs" style={{ color: getThemeColor('productCard.category') }}>Category label</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="font-black" style={{ color: getThemeColor('productCard.price') }}>৳ 680</span>
                                        <span className="rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: getThemeColor('productCard.addToCartBackground'), color: getThemeColor('productCard.addToCartText') }}>Add</span>
                                    </div>
                                </div>
                            </div>
                            <div className="px-4 py-3 text-xs font-bold" style={{ backgroundColor: getThemeColor('footer.background'), color: getThemeColor('footer.text') }}>
                                Footer links and policy text
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="mb-3 flex min-w-0 flex-col gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-950">Palette presets</p>
                                <p className="mt-1 text-xs text-slate-500">Pick a polished starting point. You can still edit every section after.</p>
                            </div>
                            <BuilderButton type="button" variant="secondary" onClick={resetColorPalette} className="w-full">Reset palette</BuilderButton>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {colorPalettePresets.map(preset => (
                                <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => applyColorSet(preset.colors, preset.name)}
                                    className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-900">{preset.name}</span>
                                        <span className="mt-1 block text-xs text-slate-500">Apply this storefront palette</span>
                                    </span>
                                    <span className="flex shrink-0 overflow-hidden rounded-full border border-slate-200">
                                        {preset.swatches.map(color => <span key={color} className="h-7 w-7" style={{ backgroundColor: color }} />)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeColorMode === 'sections' && (
                <div className="space-y-4">
                    <label className="relative block">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <span className="sr-only">Search color settings</span>
                        <input
                            value={colorSearch}
                            onChange={event => setColorSearch(event.target.value)}
                            className={`${inputClass} pl-9`}
                            placeholder="Search colors, e.g. product, footer, button"
                        />
                    </label>
                    {visibleGroups.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">No color fields match your search.</div>
                    ) : visibleGroups.map(group => {
                        const open = openColorSection === group.id;
                        return (
                            <div key={group.id} className="rounded-xl border border-slate-200 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setOpenColorSection(open ? '' : group.id)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                    aria-expanded={open}
                                >
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-950">{group.title}</span>
                                        <span className="mt-1 block text-xs text-slate-500">{group.description}</span>
                                    </span>
                                    <span className="flex shrink-0 items-center gap-3">
                                        <span className="hidden overflow-hidden rounded-full border border-slate-200 sm:flex">
                                            {group.fields.slice(0, 4).map(field => <span key={field.path} className="h-7 w-7" style={{ backgroundColor: getThemeColor(field.path, '#ffffff') }} />)}
                                        </span>
                                        <ChevronDown size={18} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
                                    </span>
                                </button>
                                {open && (
                                    <div className="space-y-4 border-t border-slate-200 p-4">
                                        <div className="flex justify-end">
                                            <BuilderButton type="button" variant="subtle" onClick={() => resetColorGroup(group.id)}>Reset this section</BuilderButton>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">{group.fields.map(renderNestedColorField)}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {activeColorMode === 'advanced' && (
                <div className="rounded-xl border border-slate-200 bg-white">
                    <button
                        type="button"
                        onClick={() => setAdvancedColorsOpen(open => !open)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        aria-expanded={advancedColorsOpen}
                    >
                        <span>
                            <span className="block text-sm font-black text-slate-950">Advanced legacy colors</span>
                            <span className="mt-1 block text-xs text-slate-500">Fine-tune the original theme keys used by older saved storefronts.</span>
                        </span>
                        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${advancedColorsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {advancedColorsOpen && (
                        <div className="space-y-4 border-t border-slate-200 p-4">
                            <div className="flex justify-end">
                                <BuilderButton type="button" variant="secondary" onClick={resetColorPalette}>Reset all colors</BuilderButton>
                            </div>
                            {colorGroups.map(group => (
                                <div key={group.title} className="rounded-lg border border-slate-200 p-3">
                                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{group.title}</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {group.fields.map(field => (
                                            <FieldShell
                                                key={field.key}
                                                label={field.label}
                                                help={field.help}
                                                error={!isHexColor(theme.colors?.[field.key]) ? 'Enter a valid hex color, for example #0f766e.' : ''}
                                            >
                                                <div className="flex min-w-0 gap-2" data-field-path={`colors.${field.key}`}>
                                                    <input
                                                        type="color"
                                                        value={isHexColor(theme.colors?.[field.key]) ? theme.colors[field.key] : '#000000'}
                                                        onChange={event => setColor(field.key, event.target.value)}
                                                        className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                                                        aria-label={`${field.label} color picker`}
                                                    />
                                                    <input
                                                        value={theme.colors?.[field.key] || ''}
                                                        onChange={event => setColor(field.key, event.target.value)}
                                                        className={`${inputClass} min-w-0`}
                                                        aria-label={`${field.label} hex value`}
                                                    />
                                                </div>
                                            </FieldShell>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </BuilderCard>
    );
}
