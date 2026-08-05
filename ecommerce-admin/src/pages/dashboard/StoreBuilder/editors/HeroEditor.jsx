import { ChevronDown, ChevronUp, Image, LayoutTemplate, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { BuilderButton, BuilderCard, BuilderInput, BuilderSelect, BuilderTextarea, BuilderToggle } from '../builderUi.jsx';
import { HERO_SLIDE_LIMIT, heroVariantOptions } from '../storeBuilderConstants.jsx';
import { getBuilderHeroSlides } from '../storeBuilderThemeUtils.js';

export function HeroEditor({ theme, uploadingThemeImage, setThemeGroup, addHeroSlide, updateHeroSlide, moveHeroSlide, removeHeroSlide, handleThemeImageUpload, advancedDesignEnabled = false }) {
    const heroSlides = getBuilderHeroSlides(theme.hero);
    const [selectedSlideId, setSelectedSlideId] = useState(heroSlides[0]?.id || 'slide-0');
    const matchedIndex = heroSlides.findIndex((item, index) => String(item.id || `slide-${index}`) === String(selectedSlideId));
    const selectedIndex = matchedIndex >= 0 ? matchedIndex : 0;
    const slide = heroSlides[selectedIndex];

    const deleteSelectedSlide = () => {
        const nextSlide = heroSlides[selectedIndex + 1] || heroSlides[selectedIndex - 1];
        setSelectedSlideId(nextSlide?.id || 'slide-0');
        removeHeroSlide(selectedIndex);
    };

    return (
        <div className="space-y-4">
            <BuilderCard
                title="Hero banner"
                description="Choose a slide, then edit only its content and image settings."
                icon={LayoutTemplate}
                actions={<BuilderButton type="button" variant="secondary" onClick={addHeroSlide} disabled={heroSlides.length >= HERO_SLIDE_LIMIT}><Plus size={16} /> Add slide</BuilderButton>}
            >
                <BuilderSelect
                    label="Hero layout"
                    value={theme.hero?.variant || 'fullBleed'}
                    onChange={event => setThemeGroup('hero', 'variant', event.target.value)}
                    disabled={!advancedDesignEnabled}
                    help={advancedDesignEnabled ? 'All layouts keep the same slides, text, and buttons.' : 'Structural layouts require full Store Builder access.'}
                >
                    {heroVariantOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </BuilderSelect>
                <BuilderSelect label="Hero height" value={theme.hero?.height || 'Medium'} onChange={event => setThemeGroup('hero', 'height', event.target.value)}>
                    <option>Compact</option><option>Medium</option><option>Tall</option>
                </BuilderSelect>
                <BuilderInput
                    label="Image overlay"
                    type="number"
                    min="0"
                    max="80"
                    value={theme.hero?.overlayOpacity ?? 25}
                    onChange={event => setThemeGroup('hero', 'overlayOpacity', Math.min(80, Math.max(0, Number(event.target.value) || 0)))}
                    help="Darkens banner images without fading the headline or buttons. Use 0 for no overlay."
                />

                <div className="space-y-2" role="tablist" aria-label="Hero slides">
                    {heroSlides.map((item, index) => {
                        const active = index === selectedIndex;
                        const previewImage = item.desktopImage || item.mobileImage;
                        return (
                            <button
                                key={item.id || index}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setSelectedSlideId(item.id || `slide-${index}`)}
                                className={`flex min-h-14 w-full items-center gap-3 rounded-lg border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                            >
                                <span className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                                    {previewImage ? <img src={previewImage} alt="" className="h-full w-full object-cover" /> : <Image size={18} className="text-slate-300" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-black uppercase tracking-wide text-slate-400">Slide {index + 1}</span>
                                    <span className="mt-0.5 block truncate text-sm font-bold text-slate-900">{item.title || 'Untitled slide'}</span>
                                </span>
                                {item.enabled === false && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">Hidden</span>}
                            </button>
                        );
                    })}
                </div>
            </BuilderCard>

            {slide && (
                <BuilderCard
                    title={`Slide ${selectedIndex + 1}`}
                    description="Changes appear immediately in the storefront preview."
                    actions={(
                        <div className="flex items-center gap-1">
                            <button type="button" aria-label="Move slide up" title="Move up" onClick={() => moveHeroSlide(selectedIndex, -1)} disabled={selectedIndex === 0} className="min-h-10 min-w-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronUp className="mx-auto" size={15} /></button>
                            <button type="button" aria-label="Move slide down" title="Move down" onClick={() => moveHeroSlide(selectedIndex, 1)} disabled={selectedIndex === heroSlides.length - 1} className="min-h-10 min-w-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronDown className="mx-auto" size={15} /></button>
                            <button type="button" aria-label="Delete slide" title="Delete slide" onClick={deleteSelectedSlide} className="min-h-10 min-w-10 rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"><Trash2 className="mx-auto" size={15} /></button>
                        </div>
                    )}
                >
                    <BuilderToggle
                        label="Show this slide"
                        help="Hidden slides remain in the draft but do not appear in the carousel."
                        checked={slide.enabled !== false}
                        onChange={event => updateHeroSlide(selectedIndex, 'enabled', event.target.checked)}
                    />

                    <section className="space-y-3" aria-labelledby="hero-slide-content">
                        <h3 id="hero-slide-content" className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Content</h3>
                        <BuilderInput label="Headline" value={slide.title || ''} onChange={event => updateHeroSlide(selectedIndex, 'title', event.target.value)} />
                        <BuilderTextarea label="Subtitle" value={slide.subtitle || ''} onChange={event => updateHeroSlide(selectedIndex, 'subtitle', event.target.value)} />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderInput label="Badge text" value={slide.badgeText || ''} onChange={event => updateHeroSlide(selectedIndex, 'badgeText', event.target.value)} />
                            <BuilderInput label="Offer text" value={slide.discountText || ''} onChange={event => updateHeroSlide(selectedIndex, 'discountText', event.target.value)} />
                        </div>
                    </section>

                    <section className="space-y-3 border-t border-slate-100 pt-4" aria-labelledby="hero-slide-images">
                        <h3 id="hero-slide-images" className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Images</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {[['desktopImage', 'Desktop image', 'Wide image for laptop and desktop screens.'], ['mobileImage', 'Mobile image', 'Optional. The desktop image is used when this is empty.']].map(([key, label, help]) => (
                                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <BuilderInput label={label} value={slide[key] || ''} onChange={event => updateHeroSlide(selectedIndex, key, event.target.value)} placeholder="https://..." help={help} />
                                    <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-within:ring-2 focus-within:ring-indigo-500">
                                        <Upload size={14} />{uploadingThemeImage ? 'Uploading...' : 'Upload image'}
                                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingThemeImage} onChange={event => handleThemeImageUpload(event, url => updateHeroSlide(selectedIndex, key, url), slide[key])} />
                                    </label>
                                    {slide[key] && <div className="mt-3 overflow-hidden rounded-lg border border-slate-200"><img src={slide[key]} alt="" className="h-28 w-full object-cover" /></div>}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-3 border-t border-slate-100 pt-4" aria-labelledby="hero-slide-actions">
                        <h3 id="hero-slide-actions" className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Buttons</h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderInput label="Primary button text" value={slide.primaryCtaText || ''} onChange={event => updateHeroSlide(selectedIndex, 'primaryCtaText', event.target.value)} />
                            <BuilderInput label="Primary button link" value={slide.primaryCtaLink || ''} onChange={event => updateHeroSlide(selectedIndex, 'primaryCtaLink', event.target.value)} />
                            <BuilderInput label="Secondary button text" value={slide.secondaryCtaText || ''} onChange={event => updateHeroSlide(selectedIndex, 'secondaryCtaText', event.target.value)} />
                            <BuilderInput label="Secondary button link" value={slide.secondaryCtaLink || ''} onChange={event => updateHeroSlide(selectedIndex, 'secondaryCtaLink', event.target.value)} />
                        </div>
                    </section>

                    <details className="rounded-lg border border-slate-200 bg-white">
                        <summary className="cursor-pointer px-3 py-3 text-sm font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Advanced image positioning</summary>
                        <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
                            {[['desktopFocalPoint', 'Desktop'], ['mobileFocalPoint', 'Mobile']].map(([pointKey, label]) => (
                                <div key={pointKey} className="rounded-lg bg-slate-50 p-3">
                                    <p className="text-xs font-bold text-slate-700">{label} focus</p>
                                    <label className="mt-2 block text-[11px] font-semibold text-slate-500">Horizontal: {slide[pointKey]?.x ?? 50}%</label>
                                    <input type="range" min="0" max="100" value={slide[pointKey]?.x ?? 50} onChange={event => updateHeroSlide(selectedIndex, pointKey, { ...(slide[pointKey] || {}), x: Number(event.target.value) })} className="w-full accent-indigo-600" />
                                    <label className="mt-2 block text-[11px] font-semibold text-slate-500">Vertical: {slide[pointKey]?.y ?? 50}%</label>
                                    <input type="range" min="0" max="100" value={slide[pointKey]?.y ?? 50} onChange={event => updateHeroSlide(selectedIndex, pointKey, { ...(slide[pointKey] || {}), y: Number(event.target.value) })} className="w-full accent-indigo-600" />
                                </div>
                            ))}
                        </div>
                    </details>
                </BuilderCard>
            )}
        </div>
    );
}

export default HeroEditor;
