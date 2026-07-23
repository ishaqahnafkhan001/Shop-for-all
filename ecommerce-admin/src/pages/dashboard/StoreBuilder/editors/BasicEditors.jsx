import { FileText, LayoutTemplate, Palette, Search, Smartphone, Upload } from 'lucide-react';
import { BuilderButton, BuilderCard, BuilderInput, BuilderSelect, BuilderTextarea, BuilderToggle } from '../builderUi.jsx';
import { POLICY_LABELS, getDefaultPolicyText } from '../../../../utils/storeBuilderPolicies.js';

export function BrandEditor({ theme, setTheme, uploadingLogo, onLogoUpload }) {
    return (
        <BuilderCard title="Brand" description="Set the core identity customers see in your storefront header." icon={Palette}>
            <BuilderInput
                label="Logo URL"
                value={theme.logoUrl || ''}
                onChange={event => setTheme(previous => ({ ...previous, logoUrl: event.target.value }))}
                placeholder="https://..."
                help="Shown in the storefront header/navigation. This is separate from the browser tab icon."
                data-field-path="logoUrl"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                <Upload size={16} />
                {uploadingLogo ? 'Uploading...' : 'Upload storefront logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={uploadingLogo} onChange={event => onLogoUpload(event, 'storefront')} />
            </label>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <BuilderInput
                    label="Browser tab icon URL"
                    value={theme.faviconUrl || ''}
                    onChange={event => setTheme(previous => ({ ...previous, faviconUrl: event.target.value }))}
                    placeholder="https://..."
                    help="Shown as the favicon in the browser tab. Upload a square PNG, WebP, JPG, ICO, or SVG icon. If empty, Scaleup generates a simple store initial icon."
                    data-field-path="faviconUrl"
                />
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                    <Upload size={16} />
                    {uploadingLogo ? 'Uploading...' : 'Upload browser icon'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="hidden" disabled={uploadingLogo} onChange={event => onLogoUpload(event, 'favicon')} />
                </label>
                {theme.faviconUrl && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-500">
                        <img src={theme.faviconUrl} alt="" className="h-8 w-8 rounded-md border border-slate-200 object-contain" />
                        Browser icon is set separately from the navigation logo.
                    </div>
                )}
            </div>
        </BuilderCard>
    );
}

export function TypographyEditor({ theme, setThemeGroup }) {
    return (
        <BuilderCard title="Typography" description="Choose readable fonts and heading weight for a polished storefront." icon={LayoutTemplate}>
            <BuilderSelect label="Heading font" value={theme.typography?.headingFont || 'Inter'} onChange={event => setThemeGroup('typography', 'headingFont', event.target.value)} help="Used for hero, product section headings, and important titles.">
                <option>Inter</option><option>Arial</option><option>Georgia</option><option>Roboto</option>
            </BuilderSelect>
            <BuilderSelect label="Body font" value={theme.typography?.bodyFont || 'Inter'} onChange={event => setThemeGroup('typography', 'bodyFont', event.target.value)} help="Used for product names, descriptions, filters, and checkout text.">
                <option>Inter</option><option>Arial</option><option>Georgia</option><option>Roboto</option>
            </BuilderSelect>
            <BuilderSelect label="Heading weight" value={theme.typography?.headingWeight || '800'} onChange={event => setThemeGroup('typography', 'headingWeight', event.target.value)}>
                <option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option>
            </BuilderSelect>
        </BuilderCard>
    );
}

export function LayoutEditor({ theme, setTheme, setThemeGroup }) {
    return (
        <BuilderCard title="Layout" description="Control page width, section rhythm, and product grid density." icon={LayoutTemplate}>
            <BuilderSelect label="Container width" value={theme.layout?.containerWidth || theme.layout?.maxWidth || 'Wide'} onChange={event => {
                setThemeGroup('layout', 'containerWidth', event.target.value);
                setThemeGroup('layout', 'maxWidth', event.target.value === 'Full Width' ? 'Full' : event.target.value === 'Narrow' ? 'Contained' : 'Wide');
            }} help="Controls the main storefront content width. Full Width uses the whole screen.">
                <option>Narrow</option><option>Standard</option><option>Wide</option><option>Full Width</option>
            </BuilderSelect>
            <BuilderSelect label="Content spacing" value={theme.layout?.contentSpacing || theme.layout?.sectionSpacing || 'Comfortable'} onChange={event => {
                setThemeGroup('layout', 'contentSpacing', event.target.value);
                setThemeGroup('layout', 'sectionSpacing', event.target.value);
            }} help="Sets the vertical rhythm between major sections.">
                <option>Compact</option><option>Comfortable</option><option>Spacious</option>
            </BuilderSelect>
            <BuilderSelect label="Section width" value={theme.layout?.sectionWidth || 'Full Width'} onChange={event => setThemeGroup('layout', 'sectionWidth', event.target.value)} help="Prepared for per-section width control and applied to preview rhythm.">
                <option>Narrow</option><option>Standard</option><option>Wide</option><option>Full Width</option>
            </BuilderSelect>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <BuilderInput label="Top padding" type="number" min="0" max="160" value={theme.layout?.sectionPaddingTop ?? 40} onChange={event => setThemeGroup('layout', 'sectionPaddingTop', Number(event.target.value))} />
                <BuilderInput label="Bottom padding" type="number" min="0" max="160" value={theme.layout?.sectionPaddingBottom ?? 40} onChange={event => setThemeGroup('layout', 'sectionPaddingBottom', Number(event.target.value))} />
                <BuilderInput label="Top margin" type="number" min="0" max="160" value={theme.layout?.sectionMarginTop ?? 0} onChange={event => setThemeGroup('layout', 'sectionMarginTop', Number(event.target.value))} />
                <BuilderInput label="Bottom margin" type="number" min="0" max="160" value={theme.layout?.sectionMarginBottom ?? 40} onChange={event => setThemeGroup('layout', 'sectionMarginBottom', Number(event.target.value))} />
            </div>
            <BuilderSelect label="Desktop product columns" value={theme.layout?.productColumnsDesktop || 3} onChange={event => setThemeGroup('layout', 'productColumnsDesktop', Number(event.target.value))}>
                <option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option><option value={5}>5 columns</option>
            </BuilderSelect>
            <BuilderSelect label="Mobile product columns" value={theme.layout?.productColumnsMobile || 2} onChange={event => setThemeGroup('layout', 'productColumnsMobile', Number(event.target.value))}>
                <option value={1}>1 column</option><option value={2}>2 columns</option>
            </BuilderSelect>
            <BuilderSelect label="Product gap" value={theme.layout?.productGap || theme.productGridStyle || 'Comfortable'} onChange={event => {
                setThemeGroup('layout', 'productGap', event.target.value);
                setTheme(previous => ({ ...previous, productGridStyle: event.target.value }));
            }}>
                <option>Compact</option><option>Comfortable</option><option>Spacious</option><option>Editorial</option>
            </BuilderSelect>
            <BuilderSelect label="Card alignment" value={theme.layout?.cardAlignment || 'Left'} onChange={event => setThemeGroup('layout', 'cardAlignment', event.target.value)}>
                <option>Left</option><option>Center</option><option>Right</option>
            </BuilderSelect>
        </BuilderCard>
    );
}

export function SeoStatusEditor({ health }) {
    return (
        <BuilderCard title="Homepage SEO" description="Search appearance, identity, social sharing, indexing, AI suggestions, and health now live in a focused workspace." icon={Search}>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">SEO health</p><p className="mt-1 text-2xl font-black text-slate-950">{health.score}/100</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Open issues</p><p className="mt-1 text-2xl font-black text-slate-950">{health.missing?.length || 0}</p></div>
            </div>
            <a href="/dashboard/seo" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Manage Homepage SEO</a>
            <p className="text-xs leading-5 text-slate-500">Your current Store Builder draft is preserved when you open the SEO workspace.</p>
        </BuilderCard>
    );
}

export function MobileEditor({ theme, toggleThemeGroup }) {
    return (
        <BuilderCard title="Mobile" description="Tune storefront controls for small screens." icon={Smartphone}>
            <BuilderToggle label="Sticky checkout button" checked={Boolean(theme.mobile?.stickyCheckoutButton)} onChange={() => toggleThemeGroup('mobile', 'stickyCheckoutButton')} />
            <BuilderToggle label="Compact header" checked={Boolean(theme.mobile?.compactHeader)} onChange={() => toggleThemeGroup('mobile', 'compactHeader')} />
            <BuilderToggle label="Bottom navigation" checked={Boolean(theme.mobile?.showBottomNavigation)} onChange={() => toggleThemeGroup('mobile', 'showBottomNavigation')} />
        </BuilderCard>
    );
}

export function PoliciesEditor({ theme, shopName, updatePolicy, resetPolicyToDefault }) {
    return (
        <BuilderCard title="Policies" description="Default policy templates are editable. Keep them accurate for your own store before publishing." icon={FileText}>
            {['refund', 'shipping', 'privacy', 'terms'].map(key => (
                <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="text-sm font-black text-slate-950">{POLICY_LABELS[key]}</p><p className="text-xs text-slate-500">Shown on policy pages and checkout.</p></div>
                        <BuilderButton type="button" variant="secondary" onClick={() => resetPolicyToDefault(key)} className="text-xs">Reset template</BuilderButton>
                    </div>
                    <BuilderTextarea label={`${POLICY_LABELS[key]} body`} value={theme.policies?.[key] || getDefaultPolicyText(key, { storeName: shopName || 'this store' })} onChange={event => updatePolicy(key, event.target.value)} help="Customers can read this before and during checkout. This is a basic template, not legal advice." />
                </div>
            ))}
        </BuilderCard>
    );
}
