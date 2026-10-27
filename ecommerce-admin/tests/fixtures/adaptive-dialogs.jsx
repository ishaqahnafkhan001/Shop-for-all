import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PageTemplateRenderer, resolveAdaptivePage } from '@scaleup/storefront-renderer/adaptive';
import { createPreviewBootstrap, createPreviewCore, PREVIEW_ACTIONS } from '../../src/pages/dashboard/StoreBuilder/adaptive/previewState.js';
import { editorTokens } from '../../src/pages/dashboard/StoreBuilder/adaptive/adaptiveEditorState.js';
import '../../src/index.css';

// This fixture mounts the existing shared presentation, not an editor or route
// controller. All actions affect local React state; no API/provider is imported.
const bootstrap = createPreviewBootstrap();
const plans = Object.fromEntries(['track', 'header'].map(pageKind => {
    const result = resolveAdaptivePage({ siteBuilder: bootstrap.shop.theme.siteBuilder, pageKind, colorTokens: editorTokens(bootstrap.shop.theme) });
    if (!result.valid) throw new Error('Synthetic template must validate.');
    return [pageKind, result.value];
}));
const initial = scenario => {
    if (scenario.startsWith('header')) {
        const theme = scenario === 'header-long' ? { ...bootstrap.shop.theme, navigation: Array.from({ length: 12 }, (_, index) => ({
            label: `দীর্ঘ নেভিগেশন লিংক — Collection ${index + 1}`, url: '/policies', sortOrder: index,
        })) } : bootstrap.shop.theme;
        return { ...createPreviewCore('header', 'navigation', { theme, shop: bootstrap.shop }), preview: false };
    }
    const core = createPreviewCore('track', scenario, { theme: bootstrap.shop.theme });
    return { ...core, presentationVariant: 'reference', atelier: false,
        order: { ...core.order, status: scenario === 'found' ? 'Pending' : 'Delivered' },
        returnProofImages: [new File(['synthetic proof only'], 'synthetic-proof.png', { type: 'image/png' })] };
};
export default function Fixture() {
    const [scenario, setScenario] = useState('found');
    const [core, setCore] = useState(() => initial('found'));
    const [busy, setBusy] = useState(false);
    const update = key => value => setCore(previous => ({ ...previous, [key]: typeof value === 'function' ? value(previous[key]) : value }));
    const actions = { ...PREVIEW_ACTIONS, core: { ...PREVIEW_ACTIONS.core,
        setCancelOpen: update('cancelOpen'), setReturnOpen: update('returnOpen'),
        setCancelReason: update('cancelReason'), setCancelNote: update('cancelNote'),
        setReturnReason: update('returnReason'), setReturnDescription: update('returnDescription'),
        setReturnProofImages: update('returnProofImages'), setReturnProofVideo: update('returnProofVideo'),
        openReturnModal: () => update('returnOpen')(true),
        handleReturnProofImages: event => update('returnProofImages')(Array.from(event.target.files || []).slice(0, 3)),
        toggleReturnItem: item => update('selectedReturnItems')(previous => {
            const key = `${item.productId._id}:${item.variantId || ''}`;
            return previous.includes(key) ? previous.filter(value => value !== key) : [...previous, key];
        }),
    } };
    return <>
        <header className="space-y-3 border-b p-4">
            <h1 className="text-xl font-bold">Synthetic tracking dialog acceptance</h1>
            <p>No order access, OTP, upload, cancellation, return or provider request is sent.</p>
            <label className="mr-4">Example <select aria-label="Example" value={scenario} onChange={event => { setScenario(event.target.value); setCore(initial(event.target.value)); }}>
                <option value="found">Pending cancellation</option><option value="return-eligible">Eligible return</option><option value="header">Global navigation</option><option value="header-long">Long global navigation</option>
            </select></label>
            <label><input type="checkbox" checked={busy} onChange={event => setBusy(event.target.checked)} /> Simulate pending action</label>
        </header>
        <PageTemplateRenderer plan={plans[scenario.startsWith('header') ? 'header' : 'track']} pageKind={scenario.startsWith('header') ? 'header' : 'track'} data={{ core: { ...core, actionLoading: busy } }} actions={actions} />
    </>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
