import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import API from '../../api/api';

const openStatuses = new Set(['pending_analysis', 'analyzing', 'analysis_completed', 'pending_super_admin_review']);

const TrustedBadgeStatusCard = () => {
    const [data, setData] = useState(null);

    const load = useCallback(async () => {
        try {
            const response = await API.get('/admin/badges/status');
            setData(response.data.data || null);
        } catch {
            setData(null);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    if (!data) return null;

    const badgeActive = data.shopBadge?.status === 'active';
    const latestApplication = data.latestApplication;
    const isPending = openStatuses.has(latestApplication?.status);
    const checklist = data.eligibility?.checklist || [];
    const completed = checklist.filter(item => item.complete).length;
    const progress = checklist.length ? Math.round((completed / checklist.length) * 100) : 0;

    let icon = Sparkles;
    let title = 'Trusted Seller Badge';
    let description = `${progress}% of badge requirements complete. Keep improving sales, reviews, and store trust signals.`;
    let tone = 'border-slate-200 bg-white';

    if (badgeActive) {
        icon = ShieldCheck;
        title = 'Trusted badge active';
        description = 'Your badge is visible on the storefront while your account remains in good standing.';
        tone = 'border-emerald-100 bg-emerald-50';
    } else if (isPending) {
        icon = Clock3;
        title = 'Badge request in review';
        description = latestApplication.status === 'pending_super_admin_review'
            ? 'Analysis is complete and waiting for Super Admin review.'
            : 'Background analysis is running. This can take 1-2 days.';
        tone = 'border-amber-100 bg-amber-50';
    } else if (data.eligibility?.eligible) {
        icon = CheckCircle2;
        title = 'Ready to request badge';
        description = 'Your store meets the base requirements. Submit a request for background analysis.';
        tone = 'border-indigo-100 bg-indigo-50';
    }

    const Icon = icon;

    return (
        <section className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-black/5">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-950">{title}</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                </div>
                <Link
                    to="/dashboard/badges"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                    View badge
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </section>
    );
};

export default TrustedBadgeStatusCard;
