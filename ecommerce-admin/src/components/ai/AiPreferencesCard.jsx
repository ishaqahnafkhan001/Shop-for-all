import { useEffect, useState } from 'react';
import API from '../../api/api.js';

export default function AiPreferencesCard() {
    const [profile, setProfile] = useState(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const load = async () => {
        try { setProfile((await API.get('/admin/ai/preferences')).data.data); setMessage(''); }
        catch { setMessage('Brand voice could not be loaded.'); }
    };
    useEffect(() => { const controller = new AbortController();
        API.get('/admin/ai/preferences', { signal: controller.signal }).then(response => setProfile(response.data.data))
            .catch(error => { if (!controller.signal.aborted) setMessage(error.response?.data?.error || 'Brand voice could not be loaded.'); });
        return () => controller.abort();
    }, []);
    const save = async () => {
        setBusy(true);
        try { setProfile((await API.put('/admin/ai/preferences', profile)).data.data); setMessage('Brand voice saved for future suggestions.'); }
        catch (error) { setMessage(error.response?.data?.error || 'Preferences could not be saved.'); }
        finally { setBusy(false); }
    };
    const field = (key, value) => setProfile(current => ({ ...current, [key]: value }));
    return <section className="my-5 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">AI brand voice</h2>
        <p className="text-sm text-slate-600">Used by Product, Collection, Homepage SEO and Growth suggestions. Enter public business wording only. Existing content stays as saved.</p>
        {profile && <>
            <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries({ language: { auto: 'Match public content', en: 'English', bn: 'বাংলা', banglish: 'Banglish', mixed: 'Bangla and English' },
                    tone: { neutral: 'Neutral', friendly: 'Friendly', professional: 'Professional' }, length: { concise: 'Concise', detailed: 'Detailed' } }).map(([key, options]) =>
                    <label key={key} className="text-sm capitalize">{key}<select className="mt-1 block min-h-11 w-full rounded border p-2" value={profile[key]} onChange={e => field(key, e.target.value)}>
                        {Object.entries(options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select></label>)}
            </div>
            <label className="block text-sm">Public brand description<textarea className="mt-1 w-full rounded border p-2" maxLength={300} value={profile.brandDescription} onChange={e => field('brandDescription', e.target.value)} /></label>
            {['terminology', 'avoidPhrases'].map(key => <label key={key} className="block text-sm">{key === 'terminology' ? 'Preferred terms' : 'Phrases to avoid'} (up to 10, separated by commas)
                <input className="mt-1 min-h-11 w-full rounded border p-2" value={profile[key].join(',')} onChange={e => field(key, e.target.value.split(',').slice(0, 10))} />
            </label>)}
            <button type="button" disabled={busy} onClick={save} className="min-h-11 rounded bg-indigo-700 px-4 text-sm font-bold text-white disabled:opacity-50">Save brand voice</button>
        </>}
        <button type="button" onClick={load} disabled={busy} className="ml-3 text-sm underline">Reload saved voice</button>
        {message && <p role="status" className="text-sm">{message}</p>}
    </section>;
}
