import { useEffect, useState } from 'react';
import { AlertTriangle, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../api/api';

const tone = {
    critical: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900'
};

const SubscriptionUsageBanner = () => {
    const [warnings, setWarnings] = useState([]);

    useEffect(() => {
        let cancelled = false;
        API.get('/vendor/billing/usage')
            .then(response => {
                if (!cancelled) setWarnings(response.data?.data?.warnings || []);
            })
            .catch(() => {
                if (!cancelled) setWarnings([]);
            });
        return () => { cancelled = true; };
    }, []);

    if (!warnings.length) return null;
    const warning = [...warnings].sort((left, right) => right.threshold - left.threshold)[0];
    const Icon = warning.severity === 'critical' ? AlertTriangle : Gauge;

    return (
        <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${tone[warning.severity] || tone.info}`}>
            <div className="flex min-w-0 items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
                <div>
                    <p className="font-bold">Plan usage is at {warning.percentage}%</p>
                    <p className="mt-0.5 text-sm opacity-80">{warning.message}</p>
                </div>
            </div>
            <Link to="/dashboard/billing" className="text-sm font-bold underline underline-offset-4">Review plan</Link>
        </div>
    );
};

export default SubscriptionUsageBanner;
