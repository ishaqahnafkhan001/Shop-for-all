import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    RefreshCcw,
    ShieldCheck,
    Sparkles,
    XCircle
} from 'lucide-react';
import API from '../../api/api';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../../components/ui/AdminState.jsx';

const openStatuses = new Set(['pending_analysis', 'analyzing', 'analysis_completed', 'pending_super_admin_review']);

const statusTone = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    pending_analysis: 'bg-amber-50 text-amber-700 ring-amber-100',
    analyzing: 'bg-amber-50 text-amber-700 ring-amber-100',
    analysis_completed: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    pending_super_admin_review: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    revoked: 'bg-rose-50 text-rose-700 ring-rose-100',
    none: 'bg-slate-100 text-slate-600 ring-slate-200'
};

const formatStatus = (value) => String(value || 'none').replace(/_/g, ' ');

const StatusPill = ({ status }) => (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${statusTone[status] || statusTone.none}`}>
        {formatStatus(status)}
    </span>
);

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const RequirementItem = ({ item }) => (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3">
        <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${item.complete ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {item.complete ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
        </div>
    </div>
);

const ApplicationTimeline = ({ applications = [] }) => {
    if (!applications.length) {
        return (
            <AdminEmptyState
                icon={ShieldCheck}
                title="No badge request yet"
                description="When your store meets the trust requirements, request a badge and track review progress here."
                tone="slate"
                className="shadow-none"
            />
        );
    }

    return (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {applications.map((application) => (
                <div key={application.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={application.status} />
                            {application.recommendation && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">
                                    {application.recommendation}
                                </span>
                            )}
                            {Number.isFinite(application.analysisScore) && (
                                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                                    Score {application.analysisScore}/100
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                            Requested {formatDate(application.createdAt)}
                        </p>
                        {application.analysisSummary && (
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{application.analysisSummary}</p>
                        )}
                        {application.superAdminReason && (
                            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800">
                                Reason: {application.superAdminReason}
                            </p>
                        )}
                    </div>
                    <p className="text-xs font-semibold text-slate-400">Updated {formatDate(application.updatedAt)}</p>
                </div>
            ))}
        </div>
    );
};

const TrustedBadge = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await API.get('/admin/badges/status');
            setData(response.data.data || null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load trusted badge status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const latestApplication = data?.latestApplication;
    const hasOpenRequest = openStatuses.has(latestApplication?.status);
    const badgeActive = data?.shopBadge?.status === 'active';
    const checklist = data?.eligibility?.checklist || [];
    const completed = checklist.filter(item => item.complete).length;
    const progress = checklist.length ? Math.round((completed / checklist.length) * 100) : 0;
    const canRequest = data?.eligibility?.eligible && !hasOpenRequest && !badgeActive;

    const statusCopy = useMemo(() => {
        if (badgeActive) {
            return {
                icon: ShieldCheck,
                title: 'Your store has an active trust badge',
                description: 'The badge is visible on your storefront as long as your subscription, verification, and shop status remain healthy.',
                tone: 'emerald'
            };
        }
        if (hasOpenRequest) {
            return {
                icon: Clock3,
                title: 'Your badge request is in review',
                description: latestApplication?.status === 'pending_super_admin_review'
                    ? 'Analysis is complete. A Super Admin will make the final decision.'
                    : 'Background analysis is running. This can take 1-2 days.',
                tone: 'amber'
            };
        }
        if (latestApplication?.status === 'rejected') {
            return {
                icon: AlertCircle,
                title: 'Badge request was rejected',
                description: latestApplication.superAdminReason || 'Review the requirements, improve the store signals, and request again when ready.',
                tone: 'rose'
            };
        }
        return {
            icon: Sparkles,
            title: data?.eligibility?.eligible ? 'Your store is ready to request a badge' : 'Build trust signals to unlock badge review',
            description: data?.eligibility?.eligible
                ? 'Request the badge and we will analyze store quality before Super Admin review.'
                : 'Complete the checklist below. Paid plan alone never guarantees a badge.',
            tone: data?.eligibility?.eligible ? 'indigo' : 'slate'
        };
    }, [badgeActive, data?.eligibility?.eligible, hasOpenRequest, latestApplication]);

    const requestBadge = async () => {
        setRequesting(true);
        try {
            await API.post('/admin/badges/request', { badgeType: 'trusted_seller' });
            toast.success('Badge request submitted for analysis');
            await load();
        } catch (err) {
            const missing = err.response?.data?.missingRequirements || [];
            toast.error(missing[0]?.label || err.response?.data?.error || 'Unable to request badge');
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                <AdminLoadingState title="Loading trusted badge" description="Checking plan, verification, reviews, sales history, and current badge status." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                <AdminErrorState
                    title="Could not load trusted badge"
                    description={error}
                    action={<button onClick={load} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">Retry</button>}
                />
            </div>
        );
    }

    const StatusIcon = statusCopy.icon;

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Store trust</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Trusted Seller Badge</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Verified by ScaleUp based on identity verification, sales history, store age, and customer review quality.
                    </p>
                </div>
                <button
                    onClick={requestBadge}
                    disabled={!canRequest || requesting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {requesting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Request badge
                </button>
            </div>

            <section className={`rounded-2xl border p-5 shadow-sm ${
                statusCopy.tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' :
                    statusCopy.tone === 'amber' ? 'border-amber-100 bg-amber-50' :
                        statusCopy.tone === 'rose' ? 'border-rose-100 bg-rose-50' :
                            statusCopy.tone === 'indigo' ? 'border-indigo-100 bg-indigo-50' :
                                'border-slate-200 bg-white'
            }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-black/5">
                            <StatusIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-black text-slate-950">{statusCopy.title}</h2>
                                <StatusPill status={badgeActive ? 'active' : latestApplication?.status || data?.shopBadge?.status} />
                            </div>
                            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{statusCopy.description}</p>
                            {data?.shopBadge?.approvedAt && (
                                <p className="mt-2 text-xs font-semibold text-emerald-700">Approved on {formatDate(data.shopBadge.approvedAt)}</p>
                            )}
                        </div>
                    </div>
                    <div className="min-w-[160px] rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5">
                        <p className="text-3xl font-black text-slate-950">{progress}%</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">Requirements complete</p>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Requirements checklist</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">Complete every item before your store can enter badge analysis.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {completed}/{checklist.length}
                        </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {checklist.map(item => <RequirementItem key={item.key} item={item} />)}
                    </div>
                </section>

                <aside className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">What happens next?</h2>
                        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                            <p><strong className="text-slate-950">1.</strong> Request review after every requirement is complete.</p>
                            <p><strong className="text-slate-950">2.</strong> Background analysis checks sales, reviews, refund signals, and abuse reports.</p>
                            <p><strong className="text-slate-950">3.</strong> Super Admin makes the final approve or reject decision.</p>
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Quick actions</h2>
                        <div className="mt-4 space-y-2">
                            <Link to="/dashboard/verification" className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                Check NID verification <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link to="/dashboard/store-builder" className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                Add Facebook link <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link to="/dashboard/billing" className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                Review plan and subscription <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </section>
                </aside>
            </div>

            <section>
                <div className="mb-3">
                    <h2 className="text-lg font-black text-slate-950">Application history</h2>
                    <p className="mt-1 text-sm text-slate-500">Track analysis, Super Admin review, approval, rejection, and revocation history.</p>
                </div>
                <ApplicationTimeline applications={data?.applications || []} />
            </section>
        </div>
    );
};

export default TrustedBadge;
