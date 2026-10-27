import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ReportPeriod({ period, onChange, label = 'Reporting period' }) {
    const { user } = useAuth();
    const [draft, setDraft] = useState(period);
    const [message, setMessage] = useState('');
    const storageKey = `report-period:${user?._id}:${user?.shop_id?._id || user?.shop_id || 'shop'}`;
    const apply = event => {
        event.preventDefault();
        if (draft.range === 'custom' && (!draft.from || !draft.to || draft.from > draft.to || (new Date(draft.to) - new Date(draft.from)) / 86400000 >= 366)) {
            setMessage('Choose a valid range of at most 366 days.'); return;
        }
        onChange(draft); setMessage('');
    };
    const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(period)); setMessage('Period saved on this device.'); } catch { setMessage('This browser could not save the period.'); } };
    const restore = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            if (!saved || !['7', '30', '90', 'this-month', 'last-month', 'custom'].includes(saved.range)) throw new Error();
            onChange(saved); setDraft(saved); setMessage('');
        } catch { setMessage('No saved period is available on this device.'); }
    };
    return <div className="space-y-2">
        <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
            <label className="text-sm">{label}<select aria-label={label} value={draft.range} onChange={event => {
                const next = { range: event.target.value }; setDraft(next);
                if (next.range !== 'custom') onChange(next);
            }} className="ml-2 rounded border bg-white p-2">
                {['7', '30', '90'].map(range => <option key={range} value={range}>Last {range} days</option>)}
                <option value="this-month">This month</option><option value="last-month">Last month</option><option value="custom">Custom dates</option>
            </select></label>
            {draft.range === 'custom' && <>
                <label className="text-sm">From<input required type="date" value={draft.from || ''} onChange={event => setDraft({ ...draft, from: event.target.value })} className="ml-2 rounded border p-2" /></label>
                <label className="text-sm">Through<input required type="date" value={draft.to || ''} onChange={event => setDraft({ ...draft, to: event.target.value })} className="ml-2 rounded border p-2" /></label>
                <button className="rounded bg-indigo-700 px-3 py-2 text-white">Apply dates</button>
            </>}
            <button type="button" onClick={save} className="rounded border px-3 py-2 text-sm">Save period</button>
            <button type="button" onClick={restore} className="rounded border px-3 py-2 text-sm">Load saved period</button>
        </form>
        {message && <p role="status" className="text-sm">{message}</p>}
    </div>;
}
