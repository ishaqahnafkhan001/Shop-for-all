import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MobileEditor, LayoutEditor } from '../../src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx';
import { StorefrontPreviewContent } from '../../src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx';
import { StorefrontPreviewFrame } from '../../src/pages/dashboard/StoreBuilder/StorefrontPreviewFrame.jsx';
import { loadBuilderTheme, updateBuilderThemeSetting } from '../../src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js';
import '../../src/index.css';

const products = Array.from({ length: 6 }, (_, index) => ({ _id: `responsive-${index}`, title: `Responsive product ${index + 1}`, category: 'Accessories', images: ['/tests/fixtures/theme-media.svg'], sellingPrice: 100, stock: 10 }));
const initial = loadBuilderTheme({
    hero: { variant: 'split', bannerSlides: [{ id: 'hero', enabled: true, title: 'Made for every screen', subtitle: 'One theme, intentional responsive layouts.', desktopImage: '/tests/fixtures/theme-media.svg', mobileImage: '/tests/fixtures/theme-media.svg', primaryCtaText: 'Shop products', primaryCtaLink: '#products' }] },
    mobile: { showBottomNavigation: true },
    layout: { productColumnsMobile: 1 }, allProducts: { mobileColumns: 1 },
    homepageSections: [{ id: 'featured', type: 'FeaturedProducts', title: 'Featured products', settings: { source: { type: 'manual', productIds: products.map(product => product._id) } } },
        { id: 'desktop-copy', type: 'TextBlock', title: 'Desktop and tablet note', settings: { text: 'This section is hidden on phones.' }, mobileSettings: { isVisible: false } }],
});
function Fixture() {
    const [theme, setTheme] = useState(initial);
    const [width, setWidth] = useState(390);
    const [page, setPage] = useState('home');
    const setThemeGroup = (group, key, value) => setTheme(previous => updateBuilderThemeSetting(previous, group, key, value));
    return <div className="p-3"><h1 className="text-xl font-bold">Phase 8 responsive verification</h1><p>Synthetic products; no commerce API or database writes.</p>
        <div className="my-3 flex gap-4"><label>Viewport <select aria-label="Viewport" value={width} onChange={event => setWidth(Number(event.target.value))}>{[320, 390, 640, 767, 768, 1023, 1024, 1180, 1536].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Page <select aria-label="Page" value={page} onChange={event => setPage(event.target.value)}>{['home', 'product', 'cart', 'checkout', 'policy'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Hero variant <select aria-label="Hero variant" value={theme.hero.variant} onChange={event => setThemeGroup('hero', 'variant', event.target.value)}>{['split', 'editorial', 'minimal', 'fullBleed', 'centered'].map(value => <option key={value}>{value}</option>)}</select></label></div>
        <details><summary>Mobile controls</summary><MobileEditor theme={theme} setThemeGroup={setThemeGroup} toggleThemeGroup={(group, key) => setThemeGroup(group, key, !theme[group][key])} planAccess={{ storeBuilderAccess: 'full' }} /></details>
        <details><summary>Layout controls</summary><LayoutEditor theme={theme} setThemeGroup={setThemeGroup} setTheme={setTheme} /></details>
        <StorefrontPreviewFrame width={width} height={900} title="Responsive storefront">
            <StorefrontPreviewContent theme={theme} planAccess={{ storeBuilderAccess: 'full' }} shopName="Responsive store" previewPage={page} availableProducts={products} />
        </StorefrontPreviewFrame>
    </div>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
