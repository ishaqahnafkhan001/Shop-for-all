/* eslint-disable react-refresh/only-export-components -- Standalone test fixture intentionally mounts its own root. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getPrebuiltThemes, resolvePrebuiltTheme } from '@scaleup/storefront-theme/prebuilt';
import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { getReferenceThemeStyle } from '@scaleup/storefront-renderer/reference-core';
import { fixtureCustomer } from './atelier-route-data.js';
import { ToastCase } from './atelier-toast-case.jsx';
import { Phase4Case } from './atelier-phase4-cases.jsx';
import { Phase3Case } from './atelier-route-cases.jsx';
import { FixtureNotices, FixtureRequests } from './atelier-route-runtime.jsx';
import './atelier-routes.css';
function Fixture() {
  const [preset, setPreset] = useState('atelier-editorial');
  const [page, setPage] = useState('product');
  const [scenario, setScenario] = useState('normal');
  const [tenant, setTenant] = useState('atelier-test-a');
  const [query, setQuery] = useState('');
  const [navigation, setNavigation] = useState('');
  const [user, setUser] = useState(null);
  const theme = resolvePrebuiltTheme({
    presetId: preset,
    appliedAt: '2026-01-01T00:00:00Z'
  });
  const Case = page === 'toasts' ? ToastCase : ['product', 'category', 'collection'].includes(page) ? Phase3Case : Phase4Case;
  const navigate = href => {
    setNavigation(href);
    if (typeof href === 'string' && href.includes('?')) setQuery(href.split('?')[1]);
  };
  return <><nav className="fixture-toolbar"><strong>Isolated fixtures: synthetic data; providers mocked</strong><label>Theme <select aria-label="Theme" value={preset} onChange={e => setPreset(e.target.value)}>{getPrebuiltThemes({
            includeHidden: true
          }).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Route <select aria-label="Route" value={page} onChange={e => {
          setPage(e.target.value);
          setQuery('');
        }}>{['product', 'category', 'collection', 'cart', 'checkout', 'account', 'register', 'reset', 'dashboard', 'profile', 'security', 'vendor', 'track', 'policy-index', 'policy-refund', 'policy-shipping', 'policy-privacy', 'policy-terms', 'otp', 'consent', 'toasts'].map(p => <option key={p}>{p}</option>)}</select></label><label>Scenario <select aria-label="Scenario" value={scenario} onChange={e => setScenario(e.target.value)}>{['normal', 'loading', 'long', 'zero', 'soldout', 'no-images', 'one-image', 'broken', 'empty', 'missing', 'busy', 'otp-error', 'order-error', 'delivered'].map(p => <option key={p}>{p}</option>)}</select></label><label>Tenant <select aria-label="Tenant" value={tenant} onChange={e => setTenant(e.target.value)}><option>atelier-test-a</option><option>atelier-test-b</option></select></label><label>Session <select aria-label="Session" value={user?.role || 'Guest'} onChange={e => setUser(e.target.value === 'Guest' ? null : {
          ...fixtureCustomer,
          role: e.target.value
        })}><option>Guest</option><option>Customer</option><option>VendorAdmin</option></select></label><output aria-label="Last navigation">{navigation}</output></nav><FixtureRequests /><FixtureNotices /><div className="sf-presentation" data-sf-presentation={getStorefrontPresentationVariant(theme) === 'atelier-editorial' ? 'atelier-editorial' : undefined} style={getReferenceThemeStyle(theme)}><Case key={page + tenant + scenario} page={page} theme={theme} scenario={scenario} live showDiagnostics environment={{
        tenant,
        query,
        user,
        onUser: setUser,
        onNavigate: navigate,
        filters: Object.fromEntries(new URLSearchParams(query))
      }} /></div></>;
}
const fixtureRoot = import.meta.hot?.data.root || createRoot(document.getElementById('root'));
if (import.meta.hot) {
  import.meta.hot.data.root = fixtureRoot;
  import.meta.hot.accept();
}
fixtureRoot.render(<Fixture />);
