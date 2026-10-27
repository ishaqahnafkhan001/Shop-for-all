/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from 'lucide-react';
import { getResponsiveImageSrcSet, LinkSlot, optimizeCloudinaryImage } from '../reference/referenceCore';

export function AtelierCategories({ section, items, responsiveClass, sectionLayout, colors, LinkComponent, gridClass }) {
    return <section className={`${responsiveClass} ${sectionLayout.className} atelier-categories`} style={{ ...sectionLayout.style, color: colors.title || 'var(--sf-section-title)' }}>
        {section.settings?.visualLabel && <p className="atelier-eyebrow">{section.settings.visualLabel}</p>}
        <h2 className="atelier-section-title">{section.title || 'Shop by category'}</h2>
        <div className={`atelier-category-grid grid ${gridClass}`}>
            {items.map((item, index) => <LinkSlot key={item.id} LinkComponent={LinkComponent} href={item.href} className="atelier-category">
                <span className="atelier-category-media" style={{ backgroundColor: ['var(--sf-atelier-sage)', 'var(--sf-atelier-lilac)', 'var(--sf-atelier-peach)', 'var(--sf-atelier-mint)'][index % 4] }}>{item.image ? <img src={optimizeCloudinaryImage(item.image, { width: 640, noUpscale: true })} srcSet={getResponsiveImageSrcSet(item.image, [180, 320, 480, 640], { noUpscale: true })} sizes="(max-width: 767px) 46vw, 24vw" alt={`${item.name} category`} width="640" height="540" loading="lazy" decoding="async" /> : <span aria-hidden="true">{item.name.slice(0, 1)}</span>}</span>
                <span className="atelier-category-label"><span>{item.name}</span><ArrowUpRight size={17} aria-hidden="true" /></span>
                {item.productCount > 0 && <span className="atelier-card-meta">{item.productCount} product{item.productCount === 1 ? '' : 's'}</span>}
            </LinkSlot>)}
        </div>
    </section>;
}

export function AtelierStory({ section, image, focalPoint, responsiveClass, sectionLayout, LinkComponent }) {
    const settings = section.settings || {};
    if (!settings.text && !image) return null;
    return <section className={`${responsiveClass} ${sectionLayout.className} atelier-story`} style={sectionLayout.style}>
        <div>{settings.visualLabel && <p className="atelier-eyebrow">{settings.visualLabel}</p>}<h2>{section.title || 'Our story'}</h2></div>
        <div>{settings.text && <p className="atelier-story-copy">{settings.text}</p>}{settings.buttonText && settings.buttonLink && <LinkSlot LinkComponent={LinkComponent} href={settings.buttonLink} className="atelier-button atelier-button-lime">{settings.buttonText}<ArrowUpRight size={18} /></LinkSlot>}</div>
        {image && <img className="atelier-story-image" src={optimizeCloudinaryImage(image, { width: 1200 })} alt="" width="1200" height="600" loading="lazy" decoding="async" style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }} />}
    </section>;
}
