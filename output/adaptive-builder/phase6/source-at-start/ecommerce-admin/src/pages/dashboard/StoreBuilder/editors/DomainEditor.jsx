import { Copy, Globe, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BuilderButton, BuilderCard, BuilderInput } from '../builderUi.jsx';

const CUSTOM_DOMAIN_DNS_TARGET = import.meta.env.VITE_CUSTOM_DOMAIN_DNS_TARGET
    || import.meta.env.NEXT_PUBLIC_CUSTOM_DOMAIN_DNS_TARGET
    || '';

const getDomainRecordHint = (domain = '') => {
    const cleanDomain = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0];
    const labels = cleanDomain.split('.').filter(Boolean);
    if (!cleanDomain || labels.length < 2) return null;
    return labels.length > 2
        ? { type: 'CNAME', host: labels.slice(0, -2).join('.') }
        : { type: 'ALIAS / ANAME', host: '@' };
};

const getDomainConnectionLabels = (customDomain = {}, dnsTarget = '') => {
    const ownershipVerified = customDomain?.ownershipVerified === true;
    const routingConnected = customDomain?.routingVerified === true || customDomain?.manuallyVerifiedRouting === true;
    const rawStatus = customDomain?.status || 'NotConfigured';
    return {
        displayStatus: rawStatus === 'Verified' && !routingConnected
            ? (ownershipVerified || customDomain?.lastDnsCheckStatus === 'verified' ? 'RoutingPending' : 'PendingVerification')
            : rawStatus,
        ownershipLabel: ownershipVerified ? 'Verified' : 'Not verified',
        routingLabel: routingConnected
            ? (customDomain?.manuallyVerifiedRouting ? 'Manually approved' : 'Connected')
            : (dnsTarget ? 'Not connected' : 'Not configured'),
        browserReady: routingConnected ? 'Ready' : 'Not ready'
    };
};

const copyDomainValue = async (value, label = 'Value') => {
    if (!value) return;
    try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
    } catch {
        toast.error('Could not copy value');
    }
};

export const DomainEditor = ({
    customDomain,
    setCustomDomain,
    hasUnsavedChanges,
    checkingDomain,
    onCheckDomain
}) => {
    const domainRecord = getDomainRecordHint(customDomain.domain || '');
    const expectedTxtValue = customDomain.expectedTxtValue
        || (customDomain.verificationToken ? `scaleup-verification=${customDomain.verificationToken}` : '');
    const dnsTarget = customDomain.dnsTarget || CUSTOM_DOMAIN_DNS_TARGET;
    const connectionLabels = getDomainConnectionLabels(customDomain, dnsTarget);
    const canCheckDomain = Boolean(customDomain.domain) && !hasUnsavedChanges && !checkingDomain;

    return (
        <BuilderCard title="Domain" description="Use this after your domain DNS points to the platform." icon={Globe}>
            <BuilderInput
                label="Custom domain"
                value={customDomain.domain || ''}
                onChange={event => setCustomDomain(previous => ({ ...previous, domain: event.target.value }))}
                placeholder="www.example.com"
                help="Customers can use this instead of the default subdomain after Super Admin verification."
                data-field-path="customDomain.domain"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                    <span>Status</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-900 ring-1 ring-slate-200">{connectionLabels.displayStatus}</span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    <span>Ownership: {connectionLabels.ownershipLabel}</span>
                    <span>Routing: {connectionLabels.routingLabel}</span>
                    <span>Browser access: {connectionLabels.browserReady}</span>
                    <span>Last checked: {customDomain.lastCheckedAt ? new Date(customDomain.lastCheckedAt).toLocaleString() : 'Not checked yet'}</span>
                    <span>DNS result: {customDomain.lastDnsCheckStatus || 'Not checked'}</span>
                </div>
                {customDomain.lastDnsCheckError && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">{customDomain.lastDnsCheckError}</p>
                )}
                {customDomain.adminNote && (
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">Admin note: {customDomain.adminNote}</p>
                )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                <div className="font-bold text-slate-950">DNS instructions</div>
                {customDomain.domain && expectedTxtValue ? (
                    <div className="mt-3 space-y-2">
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                            <div className="mb-2 font-bold text-slate-800">Step 1: Add TXT record to prove ownership</div>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <span><strong>Type</strong><br />TXT</span>
                                <span><strong>Name</strong><br />_scaleup</span>
                                <span className="min-w-0"><strong>Value</strong><br /><span className="break-all">{expectedTxtValue}</span></span>
                            </div>
                            <p className="mt-2 text-slate-500">This only proves that you own the domain. It does not connect the domain to your storefront.</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue('_scaleup', 'TXT host')}><Copy size={13} /> Copy host</BuilderButton>
                                <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue(expectedTxtValue, 'TXT value')}><Copy size={13} /> Copy value</BuilderButton>
                            </div>
                        </div>
                        {dnsTarget && domainRecord ? (
                            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                <div className="mb-2 font-bold text-slate-800">Step 2: Point your domain to Scaleup</div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    <span><strong>Type</strong><br />{domainRecord.type}</span>
                                    <span><strong>Name</strong><br />{domainRecord.host}</span>
                                    <span className="min-w-0"><strong>Target</strong><br /><span className="break-all">{dnsTarget}</span></span>
                                </div>
                                <p className="mt-2 text-slate-500">This routing record is required before customers can open your storefront on this domain.</p>
                                {domainRecord.host === '@' && (
                                    <p className="mt-2 rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">Root domains often need ALIAS/ANAME or hosting support. If your DNS provider does not support this, contact support.</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue(domainRecord.host, 'DNS host')}><Copy size={13} /> Copy host</BuilderButton>
                                    <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue(dnsTarget, 'DNS target')}><Copy size={13} /> Copy target</BuilderButton>
                                </div>
                            </div>
                        ) : (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">Contact support to connect your domain. DNS target is not configured yet.</p>
                        )}
                        <p className="text-xs leading-5 text-slate-500">After updating DNS, click Check verification. DNS changes may take a few minutes to several hours.</p>
                        <BuilderButton onClick={onCheckDomain} disabled={!canCheckDomain} className="w-full">
                            <RefreshCw size={15} className={checkingDomain ? 'animate-spin' : ''} />
                            {checkingDomain ? 'Checking DNS...' : 'Check verification'}
                        </BuilderButton>
                        {hasUnsavedChanges && <p className="text-xs leading-5 text-slate-500">Publish your latest domain changes before checking DNS.</p>}
                    </div>
                ) : (
                    <p className="mt-2 text-xs leading-5 text-slate-500">Add and publish a custom domain first. We will generate a TXT verification value after the domain is saved.</p>
                )}
            </div>
        </BuilderCard>
    );
};

export default DomainEditor;
