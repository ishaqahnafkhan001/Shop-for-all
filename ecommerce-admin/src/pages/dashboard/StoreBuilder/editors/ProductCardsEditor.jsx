import { ShoppingBag } from 'lucide-react';
import { BuilderCard, BuilderInput, BuilderSelect, BuilderToggle } from '../builderUi.jsx';

export function ProductCardsEditor({ theme, setThemeGroup, toggleThemeGroup }) {
    return (
        <div className="space-y-4">
            <BuilderCard title="All Products" description="This fixed storefront section always appears after flexible homepage sections." icon={ShoppingBag}>
                <BuilderToggle label="Show All Products section" checked={theme.allProducts?.isEnabled !== false} onChange={() => setThemeGroup('allProducts', 'isEnabled', theme.allProducts?.isEnabled === false)} />
                <BuilderInput label="Section title" value={theme.allProducts?.title || ''} onChange={event => setThemeGroup('allProducts', 'title', event.target.value)} placeholder="Shop products" />
                <BuilderInput label="Section subtitle" value={theme.allProducts?.subtitle || ''} onChange={event => setThemeGroup('allProducts', 'subtitle', event.target.value)} placeholder="Optional helper text above the product catalog" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <BuilderSelect label="Products per row on desktop" value={theme.allProducts?.desktopColumns || theme.layout?.productColumnsDesktop || 3} onChange={event => { setThemeGroup('allProducts', 'desktopColumns', Number(event.target.value)); setThemeGroup('layout', 'productColumnsDesktop', Number(event.target.value)); }}><option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option><option value={5}>5 columns</option></BuilderSelect>
                    <BuilderSelect label="Products per row on tablet" value={theme.allProducts?.tabletColumns || 2} onChange={event => setThemeGroup('allProducts', 'tabletColumns', Number(event.target.value))}><option value={1}>1 column</option><option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option></BuilderSelect>
                    <BuilderSelect label="Products per row on phone" value={theme.allProducts?.mobileColumns || theme.layout?.productColumnsMobile || 2} onChange={event => { setThemeGroup('allProducts', 'mobileColumns', Number(event.target.value)); setThemeGroup('layout', 'productColumnsMobile', Number(event.target.value)); }}><option value={1}>1 column</option><option value={2}>2 columns</option></BuilderSelect>
                </div>
                <BuilderSelect label="Section spacing" value={theme.allProducts?.spacing || theme.layout?.contentSpacing || 'Comfortable'} onChange={event => setThemeGroup('allProducts', 'spacing', event.target.value)}><option>Compact</option><option>Comfortable</option><option>Spacious</option></BuilderSelect>
            </BuilderCard>
            <BuilderCard title="Product cards" description="Control how products appear in grids across desktop and mobile." icon={ShoppingBag}>
                <BuilderSelect label="Product card style" value={theme.productCard?.style || 'Modern'} onChange={event => setThemeGroup('productCard', 'style', event.target.value)}><option>Minimal</option><option>Modern</option><option>Premium</option></BuilderSelect>
                <BuilderSelect label="Product image fit" value={theme.productCard?.imageFit || 'Contain'} onChange={event => setThemeGroup('productCard', 'imageFit', event.target.value)}><option>Contain</option><option>Cover</option></BuilderSelect>
                <BuilderSelect label="Image aspect ratio" value={theme.productCard?.aspectRatio || 'Square'} onChange={event => setThemeGroup('productCard', 'aspectRatio', event.target.value)}><option>Square</option><option>Portrait</option><option>Landscape</option></BuilderSelect>
                <BuilderSelect label="Product card corner roundness" value={theme.productCard?.borderRadius || 'Rounded'} onChange={event => setThemeGroup('productCard', 'borderRadius', event.target.value)}><option>Soft</option><option>Rounded</option><option>Square</option></BuilderSelect>
                <BuilderSelect label="Image corners" value={theme.productCard?.imageRadius || 'Rounded'} onChange={event => setThemeGroup('productCard', 'imageRadius', event.target.value)}><option>Soft</option><option>Rounded</option><option>Square</option></BuilderSelect>
                <BuilderSelect label="Shadow" value={theme.productCard?.shadow || 'Soft'} onChange={event => setThemeGroup('productCard', 'shadow', event.target.value)}><option>None</option><option>Soft</option><option>Elevated</option></BuilderSelect>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <BuilderSelect label="Title size" value={theme.productCard?.titleSize || 'Medium'} onChange={event => setThemeGroup('productCard', 'titleSize', event.target.value)}><option>Small</option><option>Medium</option><option>Large</option></BuilderSelect>
                    <BuilderSelect label="Title weight" value={theme.productCard?.titleWeight || '800'} onChange={event => setThemeGroup('productCard', 'titleWeight', event.target.value)}><option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option></BuilderSelect>
                    <BuilderSelect label="Price size" value={theme.productCard?.priceSize || 'Medium'} onChange={event => setThemeGroup('productCard', 'priceSize', event.target.value)}><option>Small</option><option>Medium</option><option>Large</option></BuilderSelect>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">To change product card colors, open Store Layout → Colors → Product Cards.</div>
                {[['showCategory', 'Show category'], ['showRating', 'Show rating'], ['showReviews', 'Show reviews'], ['showStock', 'Show stock'], ['showDiscountBadge', 'Show discount badge'], ['showQuickBuy', 'Show quick buy'], ['hoverZoom', 'Hover image zoom']].map(([key, label]) => <BuilderToggle key={key} label={label} checked={theme.productCard?.[key] !== false} onChange={() => toggleThemeGroup('productCard', key)} />)}
                <BuilderToggle label="Show SKU" checked={Boolean(theme.productCard?.showSku)} onChange={() => toggleThemeGroup('productCard', 'showSku')} />
                <BuilderToggle label="Show wishlist button" checked={Boolean(theme.productCard?.showWishlist)} onChange={() => toggleThemeGroup('productCard', 'showWishlist')} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <BuilderSelect label="Button style" value={theme.productCard?.buttonStyle || 'Solid'} onChange={event => setThemeGroup('productCard', 'buttonStyle', event.target.value)}><option>Solid</option><option>Outline</option><option>Ghost</option></BuilderSelect>
                    <BuilderSelect label="Add-to-cart button shape" value={theme.productCard?.buttonShape || 'Rounded'} onChange={event => setThemeGroup('productCard', 'buttonShape', event.target.value)}><option>Soft</option><option>Rounded</option><option>Pill</option><option>Square</option></BuilderSelect>
                </div>
            </BuilderCard>
        </div>
    );
}

export default ProductCardsEditor;
