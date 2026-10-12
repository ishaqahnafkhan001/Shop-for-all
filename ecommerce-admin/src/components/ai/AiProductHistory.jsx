import { useEffect, useRef, useState } from 'react';
import API from '../../api/api.js';
import { aiSourceLabel } from '../../utils/aiSourceLabel.js';

export default function AiProductHistory({ entityId, operationId, onReview }) {
    const [items, setItems] = useState([]), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const enabled = /^[a-f0-9]{24}$/i.test(entityId || '');
    const activeRequest = useRef(null);
    const load = async () => { if (enabled) setItems((await API.get('/admin/ai/history', { params: { entityId } })).data.data); };
    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        API.get('/admin/ai/history', { params: { entityId }, signal: controller.signal }).then(response => setItems(response.data.data))
            .catch(error => { if (!controller.signal.aborted) setMessage(error.response?.data?.error || 'History could not be loaded.'); });
        return () => { controller.abort(); activeRequest.current?.abort(); };
    }, [entityId, enabled]);
    const action = async fn => {
        activeRequest.current?.abort();
        const controller = new AbortController();
        activeRequest.current = controller;
        setBusy(true); setMessage('');
        try { await fn({ signal: controller.signal }); if (!controller.signal.aborted) await load(); }
        catch (error) { if (!controller.signal.aborted) setMessage(error.response?.data?.error || 'History could not be updated.'); }
        finally { if (!controller.signal.aborted) setBusy(false); }
    };
    return <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Saved Product suggestions</summary>
        <p className="my-2 text-xs text-slate-500">Opt in to save description, SEO and ALT suggestions for 30 days. Up to 50 per store, shared with staff who can edit products. Deleting history leaves product content unchanged.</p>
        {!enabled ? <p>Save this product first to use its suggestion history.</p> : <>
            <button type="button" disabled={busy || !operationId} className="min-h-10 underline disabled:opacity-50" onClick={() => action(async options => {
                await API.post('/admin/ai/history', { entityId, operationId }, options); setMessage('Original generated wording saved to history. Your edits stay in the product form.');
            })}>Save latest generated wording</button>
            {items.map(item => <article key={item._id} className="mt-3 border-t pt-3">
                <p className="text-xs">{new Date(item.createdAt).toLocaleString()} · {aiSourceLabel(item.provenance.source)} · {item.application?.state === 'saved' ? 'Saved to product' : item.application?.state === 'applied_to_form' ? 'Applied to form; product save pending' : 'Saved suggestion'}</p>
                <div className="flex flex-wrap gap-3">
                    <button type="button" disabled={busy} className="min-h-10 underline" onClick={() => action(async options => {
                        const response = await API.get(`/admin/ai/history/${item._id}/review`, options);
                        if (!options.signal.aborted) onReview(response.data.data);
                    })}>Compare and review</button>
                    <button type="button" disabled={busy} className="min-h-10 text-rose-700 underline" onClick={() => action(options => API.delete(`/admin/ai/history/${item._id}`, options))}>Delete saved suggestion</button>
                    <select aria-label="Suggestion feedback" className="min-h-10 rounded border" disabled={busy} value={item.feedback || ''} onChange={e => action(options => API.put(`/admin/ai/history/${item._id}/feedback`, { reason: e.target.value }, options))}>
                        <option value="">Optional feedback</option>
                        {['useful', 'incorrect_facts', 'too_generic', 'wrong_tone', 'wrong_language', 'too_long', 'too_short', 'missing_details'].map(reason => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}
                    </select>
                </div>
            </article>)}
        </>}
        {message && <p role="status" className="mt-2 text-xs">{message}</p>}
    </details>;
}
