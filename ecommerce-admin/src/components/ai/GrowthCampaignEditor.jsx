import { useEffect, useState } from 'react';
import API from '../../api/api.js';
import { useAiOperation } from '../../hooks/useAiOperation.js';
import { useAiUndo } from '../../hooks/useAiUndo.js';
import AiOperationStatus, { AiFieldComparison } from './AiOperationStatus.jsx';
import { aiSourceLabel } from '../../utils/aiSourceLabel.js';
import { applyCampaignSuggestion, currentCampaignProduct } from '../../utils/applyCampaignSuggestion.js';

const FIELDS = ['primaryText', 'headline', 'description', 'callToAction'];
const LABELS = { primaryText: 'Primary caption', headline: 'Headline', description: 'Description', callToAction: 'Call to action' };
const empty = () => ({ name: 'Campaign draft', status: 'draft', content: { primaryText: '', headline: '', description: '', callToAction: 'Shop Now' } });
const compactButton = 'min-h-10 rounded border border-slate-300 px-3 text-xs font-semibold disabled:opacity-50';

export default function GrowthCampaignEditor({ productId, product, interval, range, language, generated, canUseGenerated }) {
    const [draft, setDraft] = useState(empty), [saved, setSaved] = useState([]), [candidate, setCandidate] = useState(null);
    const [selected, setSelected] = useState(FIELDS), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const [sourceOperation, setSourceOperation] = useState(null);
    const [appliedFields, setAppliedFields] = useState([]), [manualFields, setManualFields] = useState([]);
    const [now, setNow] = useState(Date.now);
    const currentProduct = currentCampaignProduct(product, draft.currentProduct);
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
    const input = { draftId: draft._id, version: draft.version, content: draft.content, interval, range, language };
    const operation = useAiOperation({ feature: 'growth.ad_planning', entity: productId, input });
    const undo = useAiUndo(draft._id || productId, draft, setDraft);
    const load = async () => setSaved((await API.get('/admin/growth/campaign-drafts', { params: { productId } })).data.data);
    useEffect(() => {
        const controller = new AbortController();
        API.get('/admin/growth/campaign-drafts', { params: { productId }, signal: controller.signal }).then(response => setSaved(response.data.data))
            .catch(error => { if (!controller.signal.aborted) setMessage(error.response?.data?.error || 'Drafts could not be loaded.'); });
        return () => controller.abort();
    }, [productId]);
    const action = async fn => {
        setBusy(true); setMessage('');
        try { await fn(); }
        catch (error) { setMessage(error.response?.data?.error || 'The draft could not be updated.'); }
        finally { setBusy(false); }
    };
    const edit = (key, value) => { setManualFields(current => [...new Set([...current, key])]); setDraft(current => ({ ...current, content: { ...current.content, [key]: value }, provenance: { ...current.provenance, fieldOrigins: { ...current.provenance?.fieldOrigins, [key]: { source: 'manual' } } } })); };
    const receive = response => { if (response) setCandidate(response.data.data); };
    const regenerate = async () => {
        if (!selected.length) return;
        const body = { productId, range, interval, language, requestedFields: selected, draftId: draft._id || 'new', draftVersion: draft.version || 0 };
        setCandidate(null);
        receive(await operation.run(options => API.post('/admin/growth/generate-ad-copy', body, options)));
    };
    const apply = (suggestion, isFreshGeneration = false) => {
        if (isFreshGeneration ? !canUseGenerated() : !operation.canApply()) { setMessage('Inputs changed. Generate again before applying.'); return; }
        const { draft: next, fields } = applyCampaignSuggestion(draft, suggestion, selected);
        if (!fields.length) return;
        undo.record(draft, next);
        setAppliedFields(fields); setManualFields(current => current.filter(key => !fields.includes(key)));
        setSourceOperation(suggestion.meta?.operationId || null);
        operation.rebase({ ...input, content: next.content });
        setDraft(next); setCandidate(null); setMessage('Selected wording applied to this draft. Save when ready.');
    };
    const save = () => action(async () => {
        const before = draft;
        const body = { ...draft, productId, appliedFields, manualFields, ...(sourceOperation ? { operationId: sourceOperation } : {}) };
        const response = draft._id ? await API.put(`/admin/growth/campaign-drafts/${draft._id}`, body) : await API.post('/admin/growth/campaign-drafts', body);
        // An edit made during save must remain in the editor, based on the returned version.
        setDraft(current => current === before ? response.data.data : { ...current, _id: response.data.data._id, version: response.data.data.version });
        setSourceOperation(null); setAppliedFields([]); setManualFields([]); undo.clear(); await load(); setMessage('Campaign draft saved.');
    });
    const choose = item => { setDraft(item); setAppliedFields([]); setManualFields([]); setSourceOperation(null); setCandidate(null); undo.clear(); operation.cancel(); };
    const copy = () => action(async () => { await navigator.clipboard.writeText(FIELDS.map(key => `${LABELS[key]}: ${draft.content[key]}`).join('\n\n')); setMessage('Draft copy copied. Review current product facts before external use.'); });
    return <section className="my-4 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
        <h3 className="font-bold">Saved campaign drafts</h3>
        <p className="text-xs text-slate-600">Planning only. Save up to 50 drafts per store, retained for 90 days after the last save. Staff with Growth access can edit them. Saving and copying use no AI allowance.</p>
        <div className="flex flex-wrap gap-2">
            <button type="button" className={compactButton} disabled={busy} onClick={() => choose(empty())}>New empty draft</button>
            <button type="button" className={compactButton} disabled={busy} onClick={() => action(load)}>Reload saved list</button>
            {saved.map(item => <button type="button" key={item._id} disabled={busy} className={compactButton} onClick={() => choose(item)}>Load {item.name} ({item.status}, v{item.version})</button>)}
        </div>
        {(draft.productChanged || draft.evidenceStale || draft.evidence?.interval?.to && now - new Date(draft.evidence.interval.to) > 86400000 || currentProduct?.version && draft.evidence?.product?.version && currentProduct.version !== draft.evidence.product.version) && <p className="text-sm text-amber-900">This draft has historical evidence or changed product facts. Review it before copying or reuse.</p>}
        <p className="text-xs">Current product: {currentProduct?.title}. Current selling price: {currentProduct?.sellingPrice ?? 'See product editor'}.</p>
        {draft.evidence?.interval && <p className="text-xs">Draft evidence: {new Date(draft.evidence.interval.from).toLocaleString()} – {new Date(draft.evidence.interval.to).toLocaleString()}. Analytics are not refreshed automatically.</p>}
        <label className="block text-sm">Draft name<input disabled={busy} maxLength={100} className="mt-1 block w-full rounded border p-2" value={draft.name} onChange={e => setDraft(current => ({ ...current, name: e.target.value }))} /></label>
        {FIELDS.map(key => <div key={key} className="space-y-1">
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(key)} onChange={e => setSelected(current => e.target.checked ? [...current, key] : current.filter(field => field !== key))} />{LABELS[key]} · {aiSourceLabel(draft.provenance?.fieldOrigins?.[key]?.source || 'manual')}</label>
            {key === 'callToAction' ? <select disabled={busy} aria-label="Draft call to action" className="min-h-10 rounded border p-2" value={draft.content[key]} onChange={e => edit(key, e.target.value)}>
                {['Shop Now', 'Order Now', 'Learn More', 'Send Message'].map(value => <option key={value}>{value}</option>)}
            </select> : <textarea disabled={busy} aria-label={`Draft ${LABELS[key]}`} className="block w-full rounded border bg-white p-2 text-sm" maxLength={key === 'primaryText' ? 2500 : key === 'headline' ? 160 : 500} value={draft.content[key]} onChange={e => edit(key, e.target.value)} />}
        </div>)}
        {generated && <div className="rounded border bg-white p-3">
            <AiFieldComparison current={draft.content} proposed={Object.fromEntries(FIELDS.map(key => [key, generated[key]]))} />
            <button type="button" disabled={busy || !selected.length || !canUseGenerated()} className={compactButton} onClick={() => apply(generated, true)}>Use selected generated fields in draft</button>
        </div>}
        <button type="button" className={compactButton} disabled={busy || operation.loading || !operation.access.allowed || !selected.length} onClick={regenerate}>Regenerate selected text fields</button>
        <AiOperationStatus operation={operation} onRetry={async () => receive(await operation.retry())} onUndo={undo.undo} />
        {candidate && <div className="rounded border bg-white p-3">
            <AiFieldComparison current={draft.content} proposed={candidate} />
            <button type="button" className={compactButton} disabled={busy || !operation.canApply()} onClick={() => apply(candidate)}>Apply selected regenerated fields</button>
        </div>}
        <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className="min-h-10 rounded bg-indigo-700 px-4 text-sm font-bold text-white disabled:opacity-50" onClick={save}>Save campaign draft</button>
            <button type="button" disabled={busy} className={compactButton} onClick={copy}>Copy draft text</button>
            {draft._id && <>
                <button type="button" disabled={busy} className={compactButton} onClick={() => action(async () => { choose((await API.post(`/admin/growth/campaign-drafts/${draft._id}/duplicate`)).data.data); await load(); })}>Duplicate saved draft</button>
                <button type="button" disabled={busy} className={compactButton} onClick={() => setDraft(current => ({ ...current, status: current.status === 'archived' ? 'draft' : 'archived' }))}>{draft.status === 'archived' ? 'Unarchive on save' : 'Archive on save'}</button>
                <button type="button" disabled={busy} className={compactButton} onClick={() => action(async () => { await API.delete(`/admin/growth/campaign-drafts/${draft._id}`); choose(empty()); await load(); })}>Delete saved draft</button>
            </>}
        </div>
        {draft.evidence && <details className="text-xs"><summary>Saved advisory audience and limitations</summary>
            <p>{draft.evidence.advisoryAudience}</p><p>Activity sufficiency: {draft.evidence.activitySufficiency || 'limited'}</p>
            <p>Interests: {(draft.evidence.interests || []).join(', ')}. Locations: {(draft.evidence.locations || []).join(', ')}</p>
            {(draft.evidence.limitations || []).map(item => <p key={item}>{item}</p>)}
        </details>}
        {message && <p role="status" className="text-sm">{message}</p>}
    </section>;
}
