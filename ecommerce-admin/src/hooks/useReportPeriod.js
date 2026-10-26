import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function useReportPeriod() {
    const [search, setSearch] = useSearchParams();
    const range = search.get('range') || '30', from = search.get('from') || '', to = search.get('to') || '';
    const period = useMemo(() => ({ range, ...(from ? { from } : {}), ...(to ? { to } : {}) }), [range, from, to]);
    const setPeriod = next => setSearch(previous => {
        const updated = new URLSearchParams(previous);
        ['range', 'from', 'to'].forEach(key => { updated.delete(key); if (next[key]) updated.set(key, next[key]); });
        return updated;
    });
    return { period, setPeriod };
}
