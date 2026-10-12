import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TypographyEditor } from '../../src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx';
import { ProductCardsEditor } from '../../src/pages/dashboard/StoreBuilder/editors/ProductCardsEditor.jsx';
import { StorefrontPreview } from '../../src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx';
import { loadBuilderTheme, updateBuilderThemeSetting } from '../../src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js';
import '../../src/index.css';
const fixtureTheme = loadBuilderTheme({ header: { variant: 'centered' }, mobile: { showBottomNavigation: true },
    hero: { bannerSlides: [{ id: 'hidden', enabled: false, title: 'Hidden hero' }] },
    navigation: [{ label: 'Collections', url: '#', megaMenu: true, children: [{ label: 'Featured', url: '#products' }, { label: 'New arrivals', url: '#products' }, { label: 'Accessories', url: '#products' }] }],
    checkoutBranding: { bannerText: 'Merchant checkout banner', trustMessage: 'Merchant trust message', buttonStyle: 'Pill' },
    colors: { checkout: { background: '#fff7ed', cardBackground: '#fffbeb', text: '#7c2d12', buttonBackground: '#7c3aed', buttonText: '#ffffff', inputBackground: '#ffffff', inputBorder: '#a78bfa', accent: '#7c3aed', success: '#15803d' }, productCard: { saleBadgeText: '#111827', saleBadgeBackground: '#facc15', variantChipSelectedBackground: '#7c3aed', variantChipSelectedText: '#ffffff' } },
});
const products = [{ _id: 'control-product', title: 'Control fixture product', category: 'Accessories', images: ['/tests/fixtures/theme-media.svg'], pricing: { sellingPrice: 100, discount: 20 }, stock: 10, averageRating: 4.5, numReviews: 7,
    variants: ['S', 'L'].map(value => ({ _id: value, isActive: true, stock: 10, attributes: [{ name: 'Size', value }] })) }];
function Fixture() {
    const [theme, setTheme] = useState(fixtureTheme);
    const [page, setPage] = useState('home');
    const [device, setDevice] = useState('desktop');
    const setThemeGroup = (group, key, value) => setTheme(previous => updateBuilderThemeSetting(previous, group, key, value));
    return <div className="p-3"><h1 className="text-xl font-bold">Phase 7 control verification</h1><p className="mb-3 text-sm">Synthetic data; actions do not call commerce APIs.</p>
        <div className="mb-3 flex gap-4"><label>Page <select aria-label="Page" value={page} onChange={event => setPage(event.target.value)}>{['home', 'product', 'checkout'].map(value => <option key={value}>{value}</option>)}</select></label><label>Device <select aria-label="Device" value={device} onChange={event => setDevice(event.target.value)}>{['desktop', 'mobile'].map(value => <option key={value}>{value}</option>)}</select></label></div>
        <details><summary>Typography controls</summary><TypographyEditor theme={theme} setThemeGroup={setThemeGroup} /></details>
        <details><summary>Product card controls</summary><ProductCardsEditor theme={theme} setThemeGroup={setThemeGroup} toggleThemeGroup={(group, key) => setThemeGroup(group, key, !theme[group][key])} /></details>
        <StorefrontPreview theme={theme} planAccess={{ storeBuilderAccess: 'full' }} shopName="Control store" previewPage={page} device={device} availableProducts={products} />
    </div>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
