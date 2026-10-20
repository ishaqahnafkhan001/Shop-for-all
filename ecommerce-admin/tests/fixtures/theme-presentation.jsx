import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createDefaultSection, SECTION_TYPES } from '@scaleup/storefront-theme';
import { resolvePrebuiltTheme, getPrebuiltThemes } from '@scaleup/storefront-theme/prebuilt';
import { StorefrontPreview, StorefrontPreviewContent } from '../../src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx';
import '../../src/index.css';
const art = '/tests/fixtures/theme-media.svg';
const products = [{ _id: 'fixture-product', title: 'Fixture product', images: [art], category: 'Collection', pricing: { sellingPrice: 1200 }, variants: [{ _id: 'variant', isActive: true, stock: 10, attributes: [] }], features: ['Merchant feature'] }];
function Fixture() {
    const [presetId, setPreset] = useState(new URLSearchParams(window.location.search).get('candidate') === 'atelier-editorial' ? 'atelier-editorial' : 'modern-electronics');
    const [page, setPage] = useState('home');
    const [device, setDevice] = useState('desktop');
    const [surface, setSurface] = useState('builder');
    const [contentCase, setContentCase] = useState('normal');
    const atelier = presetId === 'atelier-editorial';
    const fixtureProducts = atelier ? Array.from({ length: 8 }, (_, index) => ({ ...products[0], _id: `atelier-fixture-${index}`, title: ['Everyday objects', 'Studio essentials', 'Thoughtful gifts', 'Daily accessories'][index % 4] + ` ${index + 1}`, category: ['Home', 'Studio', 'Gifts', 'Accessories'][index % 4], finalPrice: 1200 + index * 150, stock: index === 3 ? 0 : 10 })) : products;
    const theme = resolvePrebuiltTheme({ presetId, currentTheme: { hero: { title: 'Merchant hero', imageUrl: art, subtitle: 'Shared presentation fixture' }, homepageSections: [
        { id: 'category', type: 'CategoryList', title: 'Categories' },
        { id: 'story', type: 'BrandStory', settings: { text: 'Merchant story', imageUrl: art } },
        { id: 'collection', type: 'CollectionShowcase', settings: { productIds: ['fixture-product'] } },
    ] }, appliedAt: '2026-10-08T00:00:00Z' });
    if (atelier) {
        Object.assign(theme.hero.bannerSlides[0], { title: 'Make room for the everyday.', subtitle: 'Discover this store’s considered selection. Explore the collection and find something for your everyday.', badgeText: 'The everyday edit', primaryCtaText: 'Explore the collection', primaryCtaLink: '#products', secondaryCtaText: 'Browse categories', secondaryCtaLink: '/categories/Home' });
        theme.hero.bannerSlides.push({ ...theme.hero.bannerSlides[0], id: 'second-fixture-slide', title: 'A different point of view.' });
        theme.footer.text = 'A synthetic merchant preview. Products and content are test fixtures.';
        theme.homepageSections = [
            { id: 'promo', type: 'PromoBlock', title: 'Discover the collection', settings: { text: 'Explore this store’s latest selection.', variant: 'strip' } },
            { id: 'categories', type: 'CategoryList', title: 'Find your kind of thing.', settings: { columns: 4, maxCategories: 12, visualLabel: '01 / Explore categories' } },
            { id: 'featured', type: 'FeaturedProducts', title: 'Objects with a point of view.', settings: { productIds: fixtureProducts.slice(0, 4).map(p => p._id) }, desktopSettings: { columns: 4 }, mobileSettings: { columns: 2 } },
            { id: 'story', type: 'BrandStory', title: 'A little about this store.', settings: { text: 'Our merchant-authored story belongs here. This fixture demonstrates how real store content flows through the shared theme renderer.', visualLabel: '03 / Our story', buttonText: 'Explore the products', buttonLink: '#products' } },
            { id: 'trust', type: 'TrustBadges', title: 'Shop with confidence', settings: { text: 'Synthetic fixture badge, Test content only' } },
        ];
    }
    if (atelier && contentCase === 'long') {
        theme.hero.bannerSlides.forEach(slide => { slide.title = 'প্রতিদিনের জন্য যত্নের সঙ্গে বেছে নেওয়া আপনার পছন্দের বিশেষ সংগ্রহ'; slide.subtitle = 'দীর্ঘ বাংলা বিবরণ। ' .repeat(12); });
        fixtureProducts[0].title = 'একটি অত্যন্ত দীর্ঘ পণ্যের নাম যা সরু পর্দায় সম্পূর্ণভাবে পড়া যাবে';
    }
    if (atelier && contentCase === 'empty') { theme.hero.bannerSlides = []; theme.hero.title = ''; theme.hero.imageUrl = ''; theme.homepageSections = []; theme.allProducts.isEnabled = false; fixtureProducts.length = 0; }
    if (atelier && contentCase === 'one') fixtureProducts.length = 1;
    if (atelier && contentCase === 'all-sections') theme.homepageSections = SECTION_TYPES.map((type, index) => createDefaultSection(type, {id: `all-${type}`,title: `Fixture ${type}`,sortOrder:index,settings:{text:type==='FAQ'?'Q: Fixture question\nA: Fixture answer':'Fixture merchant-authored content',imageUrl:art,desktopImage:art,buttonText:'Fixture action',buttonLink:'#products',productIds:fixtureProducts.slice(0,4).map(p=>p._id),reviewIds:['fixture-review']}}));
    const categoryNames = contentCase === 'empty' ? [] : contentCase === 'one' ? ['Home'] : contentCase === 'many' ? Array.from({length:12},(_,i)=>`Category ${i+1}`) : ['Home', 'Studio', 'Gifts', 'Accessories'];
    const props = { theme, shopName: atelier && contentCase === 'long' ? 'বাংলা দোকানের দীর্ঘ নাম এবং পরিচয়' : 'Fixture store', previewPage: page, device, availableProducts: fixtureProducts, availableReviews: atelier ? [{_id:'fixture-review',name:'Synthetic fixture',rating:5,comment:'Fixture review only'}] : [], availableCategories: atelier ? categoryNames.map(name => ({ name, slug: name.toLowerCase(), coverImage: art, productCount: 2 })) : ['Collection'], planAccess: { storeBuilderAccess: 'full' } };
    return <>{new URLSearchParams(window.location.search).get('baseline') === '1' && <style>{'.sf-presentation, .sf-presentation * { transition-duration: 0s !important; animation-duration: 0s !important; animation-delay: 0s !important; }'}</style>}<nav className="flex flex-wrap gap-4 p-3">
        <label>Theme <select aria-label="Theme" value={presetId} onChange={e => setPreset(e.target.value)}>{getPrebuiltThemes({ includeHidden: true }).map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
        <label>Page <select aria-label="Page" value={page} onChange={e => setPage(e.target.value)}>{['home', 'product', 'cart', 'checkout', 'policy'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Device <select aria-label="Device" value={device} onChange={e => setDevice(e.target.value)}>{['desktop', 'tablet', 'mobile', 'smallMobile'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Surface <select aria-label="Surface" value={surface} onChange={e => setSurface(e.target.value)}>{['builder', 'gallery', 'unframed'].map(value => <option key={value}>{value}</option>)}</select></label>
        {atelier && <label>Content <select aria-label="Content" value={contentCase} onChange={e=>setContentCase(e.target.value)}>{['normal','long','empty','one','many','all-sections'].map(value=><option key={value}>{value}</option>)}</select></label>}
    </nav><main style={{ maxWidth: surface === 'gallery' ? 400 : atelier && surface === 'unframed' ? 'none' : 1280, margin: 'auto' }}>{surface === 'unframed' ? <StorefrontPreviewContent {...props} /> : <StorefrontPreview {...props} thumbnail={surface === 'gallery'} />}</main></>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
