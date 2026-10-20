import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { LinkSlot } from '../reference/referenceCore';

// The existing hero owns slide resolution, focal points, timer and pause state.
export function AtelierHero({ model, media, LinkComponent, paused, onPause }) {
    const slide = model.activeHeroSlide;
    return <section className={`atelier-hero ${model.activeHeroImage ? '' : 'atelier-hero-without-media'}`} data-mobile-composition={model.mobileComposition} data-hero-height={model.hero.height} aria-label="Store highlights">
        <div className="atelier-hero-copy" data-hero-part="content">
            {slide.badgeText && <p className="atelier-eyebrow">{slide.badgeText}</p>}
            {slide.title ? <h1>{slide.title}</h1> : <h1 className="sr-only">{model.shopName || 'Online store'}</h1>}
            {model.heroOfferText && <p className="atelier-hero-offer">{model.heroOfferText}</p>}
            {slide.subtitle && <p className="atelier-hero-description">{slide.subtitle}</p>}
            {(slide.primaryCtaText && slide.primaryCtaLink || slide.secondaryCtaText && slide.secondaryCtaLink) && <div className="atelier-hero-actions">
                {slide.primaryCtaText && slide.primaryCtaLink && <LinkSlot LinkComponent={LinkComponent} href={slide.primaryCtaLink} className="atelier-button atelier-button-primary">{slide.primaryCtaText}<ArrowUpRight size={18} /></LinkSlot>}
                {slide.secondaryCtaText && slide.secondaryCtaLink && <LinkSlot LinkComponent={LinkComponent} href={slide.secondaryCtaLink} className="atelier-button atelier-button-secondary">{slide.secondaryCtaText}<ArrowUpRight size={18} /></LinkSlot>}
            </div>}
            {model.hasMultipleHeroSlides && <div className="atelier-slide-controls" aria-label="Banner slides">
                <button type="button" onClick={model.onPrevious} aria-label="Previous banner slide"><ChevronLeft size={18} /></button>
                {model.heroSlides.map((slide, index) => <button type="button" key={slide.id || index} onClick={() => model.onSelect(index)} aria-label={`Show banner slide ${index + 1}`} aria-pressed={index === model.activeHeroIndex % model.heroSlides.length}>{String(index + 1).padStart(2, '0')}</button>)}
                <button type="button" onClick={model.onNext} aria-label="Next banner slide"><ChevronRight size={18} /></button>
                <button type="button" onClick={onPause} aria-label={paused ? 'Play banner slides' : 'Pause banner slides'} aria-pressed={paused}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
            </div>}
        </div>
        {model.activeHeroImage && <div className="atelier-hero-media" data-hero-part="media">{media}<span className="atelier-hero-overlay" aria-hidden="true" style={{ backgroundColor: 'var(--sf-hero-overlay)', opacity: model.heroOverlayOpacity }} /></div>}
    </section>;
}
