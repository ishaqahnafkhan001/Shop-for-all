import { useEffect, useState } from 'react';
import API from '../../../api/api.js';

export default function DeliveryRateSettings() {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [reload, setReload] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        API.get('/admin/shipping/rates', { signal: controller.signal }).then(({ data }) => {
            setSettings(data.data); setError('');
        }).catch(error => { if (!controller.signal.aborted) setError(error.response?.data?.error || 'Delivery charges could not be loaded.'); });
        return () => controller.abort();
    }, [reload]);
    const save = async event => {
        event.preventDefault(); setSaving(true); setMessage(''); setError('');
        try {
            const { data } = await API.put('/admin/shipping/rates', {
                baseArea: settings.baseArea, insideCharge: settings.insideCharge,
                outsideCharge: settings.outsideCharge, version: settings.version,
            });
            setSettings(data.data); setMessage('Delivery charges saved. Existing orders keep their original charge.');
        } catch (error) { setError(error.response?.data?.error || 'Could not save delivery charges.'); }
        finally { setSaving(false); }
    };
    const field = key => event => setSettings(current => ({ ...current, [key]: event.target.value }));
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Customer delivery charges</h2>
        <p className="mt-1 text-sm text-gray-600">Set a base district and two customer charges in BDT. Courier expenses are separate.</p>
        {error && <div role="alert" className="my-3 text-red-700">{error} <button type="button" disabled={saving} className="underline" onClick={() => { setSettings(null); setReload(value => value + 1); }}>Reload settings</button></div>}
        {message && <p role="status" className="my-3 text-green-700">{message}</p>}
        {!settings ? <p className="mt-4">{error ? 'Settings unavailable.' : 'Loading delivery charges…'}</p> : <form onSubmit={save} className="mt-4 space-y-4">
            {!settings.configured && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Legacy defaults: inside Dhaka district ৳80; outside ৳120. Review and save the district and charges for your shop.</p>}
            <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold">Base district<select required value={settings.baseArea} onChange={field('baseArea')} className="mt-2 w-full rounded-lg border p-2.5">{settings.districts.map(district => <option key={district}>{district}</option>)}</select></label>
                <label className="text-sm font-semibold">Inside {settings.baseArea} (৳)<input required type="number" min="0" max="100000" step="0.01" value={settings.insideCharge} onChange={field('insideCharge')} className="mt-2 w-full rounded-lg border p-2.5" /></label>
                <label className="text-sm font-semibold">Outside {settings.baseArea} (৳)<input required type="number" min="0" max="100000" step="0.01" value={settings.outsideCharge} onChange={field('outsideCharge')} className="mt-2 w-full rounded-lg border p-2.5" /></label>
            </fieldset>
            <p className="text-sm text-gray-600">“Inside” means anywhere within the selected district. The customer selects their delivery district at checkout.</p>
            <button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save delivery charges'}</button>
        </form>}
    </section>;
}
