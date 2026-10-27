import { lazy, Suspense } from 'react';
import { CreditCard, Upload } from 'lucide-react';
import { BuilderCard, BuilderInput, BuilderSelect } from '../builderUi.jsx';

const CheckoutBrandingPreview = lazy(() => import('../StorefrontPreview.jsx').then(module => ({ default: module.CheckoutBrandingPreview })));

export function CheckoutEditor({ theme, shopName, uploadingLogo, onLogoUpload, setThemeGroup }) {
    return (
        <BuilderCard title="Checkout" description="Build trust at the moment customers place an order." icon={CreditCard}>
            <BuilderInput label="Checkout logo URL" value={theme.checkoutBranding?.logoUrl || ''} onChange={event => setThemeGroup('checkoutBranding', 'logoUrl', event.target.value)} placeholder="https://..." />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                <Upload size={16} />
                {uploadingLogo ? 'Uploading...' : 'Upload checkout logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={event => onLogoUpload(event, 'checkout')} />
            </label>
            <BuilderInput label="Checkout banner text" value={theme.checkoutBranding?.bannerText || ''} onChange={event => setThemeGroup('checkoutBranding', 'bannerText', event.target.value)} placeholder="Free returns for 7 days" />
            <BuilderInput label="Trust message" value={theme.checkoutBranding?.trustMessage || ''} onChange={event => setThemeGroup('checkoutBranding', 'trustMessage', event.target.value)} placeholder="Secure checkout" />
            <BuilderSelect label="Button style" value={theme.checkoutBranding?.buttonStyle || 'Rounded'} onChange={event => setThemeGroup('checkoutBranding', 'buttonStyle', event.target.value)}>
                <option>Solid</option><option>Rounded</option><option>Pill</option>
            </BuilderSelect>
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-white p-2 text-slate-600 shadow-sm"><CreditCard size={18} /></span>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Additional Payment Methods Coming Soon</p>
                        <p className="mt-1 text-sm leading-5 text-slate-500">The theme stores a scalable payment settings object without changing the current checkout flow.</p>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {['stripe', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'paypal'].map(provider => (
                        <label key={provider} className="flex cursor-not-allowed items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold capitalize text-slate-500">
                            {provider}
                            <input type="checkbox" checked={Boolean(theme.paymentSettings?.providers?.[provider])} readOnly disabled className="h-4 w-4 rounded border-slate-300" />
                        </label>
                    ))}
                </div>
            </div>
            <Suspense fallback={<div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100" aria-label="Loading checkout preview" />}>
                <CheckoutBrandingPreview theme={theme} shopName={shopName} />
            </Suspense>
        </BuilderCard>
    );
}

export default CheckoutEditor;
