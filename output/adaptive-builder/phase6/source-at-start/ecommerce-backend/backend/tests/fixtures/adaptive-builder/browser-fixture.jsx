import React, { useEffect, useMemo, useState } from 'react';
import { PageTemplateRenderer, resolveAdaptivePage } from '../../../../../packages/storefront-renderer/adaptive/index.jsx';
import { NativeImage } from '../../../../../packages/storefront-renderer/presentation/Runtime.jsx';
import { getReferenceThemeStyle } from '../../../../../packages/storefront-renderer/reference/referenceCore.jsx';
import { FALLBACK_THEME } from '../../../../../packages/storefront-theme/index.mjs';
import fixtures from './render-fixtures.cjs';
import remediation from './remediation-fixtures.cjs';

const runtime = { Link: ({ children, prefetch, ...props }) => { void prefetch; return <a {...props} onClick={event => event.preventDefault()}>{children}</a>; }, Image: NativeImage };
export function AdaptiveBrowserFixture({ pageKind, scenario = 'normal', palette = 'default', narrow = false }) {
    const [data, setData] = useState(() => {
        const initial = fixtures.pageData(pageKind, scenario);
        if (pageKind === 'product' && ['loading', 'missing'].includes(scenario)) initial.core.state = scenario;
        return initial;
    });
    const [calls, setCalls] = useState([]);
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => { setHydrated(true); }, []);
    const plan = useMemo(() => resolveAdaptivePage({ siteBuilder: remediation.remediationDocument(palette, narrow), pageKind, colorTokens: fixtures.tokens }).value, [pageKind, palette, narrow]);
    const actions = fixtures.fixtureActions().core;
    for (const name of Object.keys(actions)) actions[name] = (...args) => {
        args[0]?.preventDefault?.();
        setCalls(previous => [...previous, name]);
        if (name === 'setQuantity') setData(previous => ({ ...previous, core: { ...previous.core, quantity: args[0](previous.core.quantity) } }));
        if (name === 'input') { const { name: field, value } = args[0].target; setData(previous => ({ ...previous, core: { ...previous.core, formData: { ...previous.core.formData, [field]: value } } })); }
        if (name === 'policyConsent') setData(previous => ({ ...previous, core: { ...previous.core, policyAccepted: args[0] } }));
        if (name === 'otp') setData(previous => ({ ...previous, core: { ...previous.core, otp: { ...previous.core.otp, value: args[0] } } }));
        if (name === 'cancelOtp') setData(previous => ({ ...previous, core: { ...previous.core, otp: { ...previous.core.otp, open: false } } }));
    };
    // Inert fixture writes only: no provider, authentication, order or cart APIs.
    return <main className="sf-presentation" style={getReferenceThemeStyle(FALLBACK_THEME)}>
        <PageTemplateRenderer plan={plan} pageKind={pageKind} data={data} actions={{ core: actions, catalog: { addToCart: () => setCalls(previous => [...previous, 'catalogAdd']) } }} runtime={runtime} />
        <output id="fixture-state" data-hydrated={hydrated ? 'yes' : 'no'} aria-live="polite">Synthetic actions: {calls.join(', ') || 'none'}</output>
    </main>;
}
