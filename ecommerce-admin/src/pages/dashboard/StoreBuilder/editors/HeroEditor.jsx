import { ChevronDown, ChevronUp, LayoutTemplate, Plus, Trash2, Upload } from 'lucide-react';
import { BuilderButton, BuilderCard, BuilderInput, BuilderSelect } from '../builderUi.jsx';
import { HERO_SLIDE_LIMIT } from '../storeBuilderConstants.jsx';
import { getBuilderHeroSlides } from '../storeBuilderThemeUtils.js';

export function HeroEditor({ theme, uploadingThemeImage, setThemeGroup, addHeroSlide, updateHeroSlide, moveHeroSlide, removeHeroSlide, handleThemeImageUpload }) {
    const heroSlides = getBuilderHeroSlides(theme.hero);
    return (
        <BuilderCard title="Hero carousel" description="Each slide uses the uploaded image as the full banner background in preview and storefront." icon={LayoutTemplate} actions={<BuilderButton type="button" variant="secondary" onClick={addHeroSlide} disabled={heroSlides.length >= HERO_SLIDE_LIMIT}><Plus size={16} /> Add slide</BuilderButton>}>
            <BuilderSelect label="Hero height" value={theme.hero?.height || 'Medium'} onChange={event => setThemeGroup('hero', 'height', event.target.value)}><option>Compact</option><option>Medium</option><option>Tall</option></BuilderSelect>
            <div className="space-y-4">
                {heroSlides.map((slide, index) => (
                    <div key={slide.id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div><p className="text-sm font-black text-slate-950">Slide {index + 1}</p><p className="mt-1 text-xs text-slate-500">Desktop image fills the whole banner. Mobile image is optional.</p></div>
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={slide.enabled !== false} onChange={event => updateHeroSlide(index, 'enabled', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />Enabled</label>
                                <button type="button" aria-label="Move slide up" onClick={() => moveHeroSlide(index, -1)} disabled={index === 0} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-30"><ChevronUp size={15} /></button>
                                <button type="button" aria-label="Move slide down" onClick={() => moveHeroSlide(index, 1)} disabled={index === heroSlides.length - 1} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-30"><ChevronDown size={15} /></button>
                                <button type="button" aria-label="Delete slide" onClick={() => removeHeroSlide(index)} className="rounded-lg border border-red-200 bg-white p-2 text-red-600"><Trash2 size={15} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[['desktopImage', 'Desktop image', 'Wide image for laptop, desktop, and large screens.'], ['mobileImage', 'Mobile image', 'Optional. If empty, desktop image is used on phones.']].map(([key, label, help]) => (
                                <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                                    <BuilderInput label={label} value={slide[key] || ''} onChange={event => updateHeroSlide(index, key, event.target.value)} placeholder="https://..." help={help} />
                                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Upload size={14} />{uploadingThemeImage ? 'Uploading...' : 'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingThemeImage} onChange={event => handleThemeImageUpload(event, url => updateHeroSlide(index, key, url), slide[key])} /></label>
                                    {slide[key] && <div className="mt-3 overflow-hidden rounded-lg border border-slate-200"><img src={slide[key]} alt="" className="h-24 w-full object-cover" /></div>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderInput label="Headline" value={slide.title || ''} onChange={event => updateHeroSlide(index, 'title', event.target.value)} />
                            <BuilderInput label="Badge text" value={slide.badgeText || ''} onChange={event => updateHeroSlide(index, 'badgeText', event.target.value)} />
                            <BuilderInput label="Offer text" value={slide.discountText || ''} onChange={event => updateHeroSlide(index, 'discountText', event.target.value)} />
                            <BuilderInput label="Subtitle" value={slide.subtitle || ''} onChange={event => updateHeroSlide(index, 'subtitle', event.target.value)} />
                            <BuilderInput label="Primary button text" value={slide.primaryCtaText || ''} onChange={event => updateHeroSlide(index, 'primaryCtaText', event.target.value)} />
                            <BuilderInput label="Primary button link" value={slide.primaryCtaLink || ''} onChange={event => updateHeroSlide(index, 'primaryCtaLink', event.target.value)} />
                            <BuilderInput label="Secondary button text" value={slide.secondaryCtaText || ''} onChange={event => updateHeroSlide(index, 'secondaryCtaText', event.target.value)} />
                            <BuilderInput label="Secondary button link" value={slide.secondaryCtaLink || ''} onChange={event => updateHeroSlide(index, 'secondaryCtaLink', event.target.value)} />
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Image focus</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">{[['desktopFocalPoint', 'Desktop'], ['mobileFocalPoint', 'Mobile']].map(([pointKey, label]) => (
                                <div key={pointKey} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold text-slate-700">{label} focus</p><label className="mt-2 block text-[11px] font-semibold text-slate-500">Horizontal: {slide[pointKey]?.x ?? 50}%</label><input type="range" min="0" max="100" value={slide[pointKey]?.x ?? 50} onChange={event => updateHeroSlide(index, pointKey, { ...(slide[pointKey] || {}), x: Number(event.target.value) })} className="w-full accent-indigo-600" /><label className="mt-2 block text-[11px] font-semibold text-slate-500">Vertical: {slide[pointKey]?.y ?? 50}%</label><input type="range" min="0" max="100" value={slide[pointKey]?.y ?? 50} onChange={event => updateHeroSlide(index, pointKey, { ...(slide[pointKey] || {}), y: Number(event.target.value) })} className="w-full accent-indigo-600" /></div>
                            ))}</div>
                        </div>
                    </div>
                ))}
            </div>
        </BuilderCard>
    );
}

export default HeroEditor;
