import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { resolvePrebuiltTheme, getPrebuiltThemes } from '@scaleup/storefront-theme/prebuilt';
import { StorefrontPreview, StorefrontPreviewContent } from '../../src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx';
import '../../src/index.css';
const art = '/tests/fixtures/theme-media.svg';
const products = [{ _id: 'fixture-product', title: 'Fixture product', images: [art], category: 'Collection', pricing: { sellingPrice: 1200 }, variants: [{ _id: 'variant', isActive: true, stock: 10, attributes: [] }], features: ['Merchant feature'] }];
function Fixture() {
    const [presetId, setPreset] = useState('modern-electronics');
    const [page, setPage] = useState('home');
    const [device, setDevice] = useState('desktop');
    const [surface, setSurface] = useState('builder');
    const theme = resolvePrebuiltTheme({ presetId, currentTheme: { hero: { title: 'Merchant hero', imageUrl: art, subtitle: 'Shared presentation fixture' }, homepageSections: [
        { id: 'category', type: 'CategoryList', title: 'Categories' },
        { id: 'story', type: 'BrandStory', settings: { text: 'Merchant story', imageUrl: art } },
        { id: 'collection', type: 'CollectionShowcase', settings: { productIds: ['fixture-product'] } },
    ] }, appliedAt: '2026-10-08T00:00:00Z' });
    const props = { theme, shopName: 'Fixture store', previewPage: page, device, availableProducts: products, availableCategories: ['Collection'], planAccess: { storeBuilderAccess: 'full' } };
    return <><nav className="flex flex-wrap gap-4 p-3">
        <label>Theme <select aria-label="Theme" value={presetId} onChange={e => setPreset(e.target.value)}>{getPrebuiltThemes().map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
        <label>Page <select aria-label="Page" value={page} onChange={e => setPage(e.target.value)}>{['home', 'product', 'cart', 'checkout', 'policy'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Device <select aria-label="Device" value={device} onChange={e => setDevice(e.target.value)}>{['desktop', 'tablet', 'mobile', 'smallMobile'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Surface <select aria-label="Surface" value={surface} onChange={e => setSurface(e.target.value)}>{['builder', 'gallery', 'unframed'].map(value => <option key={value}>{value}</option>)}</select></label>
    </nav><main style={{ maxWidth: surface === 'gallery' ? 400 : 1280, margin: 'auto' }}>{surface === 'unframed' ? <StorefrontPreviewContent {...props} /> : <StorefrontPreview {...props} thumbnail={surface === 'gallery'} />}</main></>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
