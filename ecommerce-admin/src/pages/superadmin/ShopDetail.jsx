import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, BadgeCheck, Building2, ClipboardList, Flag, Globe, ShieldAlert, ShieldCheck } from 'lucide-react';
import API from '../../api/api';
import { EmptyState, ReasonModal, SectionCard, StatusBadge } from './SuperAdminComponents.jsx';

const criticalFeatureKeys = new Set(['storeBuilder', 'analytics', 'staffAccounts', 'growthCenter']);

const ShopDetail = () => {
    const { shopId } = useParams();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reasonModal, setReasonModal] = useState(null);
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [registry, setRegistry] = useState({ plans: [], features: [] });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [detailResult, plansResult] = await Promise.allSettled([
                API.get(`/super-admin/shops/${shopId}`),
                API.get('/super-admin/plans')
            ]);
            if (detailResult.status === 'rejected') throw detailResult.reason;
            setDetail(detailResult.value.data.data || null);
            if (plansResult.status === 'fulfilled') {
                setRegistry(plansResult.value.data.registry || { plans: [], features: [] });
            }
        } catch {
            toast.error('Failed to load shop detail');
        } finally {
            setLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const openReasonModal = (config) => {
        setReason('');
        setReasonModal(config);
    };

    const confirmReasonAction = async () => {
        if (!reasonModal || !reason.trim()) return;
        setActionLoading(true);
        try {
            await reasonModal.onConfirm(reason.trim());
            setReasonModal(null);
            setReason('');
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || reasonModal.error || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const updateStatus = async (status) => {
        const run = async (actionReason = '') => {
            await API.patch(`/super-admin/shops/${shopId}/status`, { status, reason: actionReason });
            toast.success(`Shop marked ${status}`);
            await load();
        };

        if (status === 'Suspended') {
            openReasonModal({
                title: 'Suspend shop',
                warning: 'This blocks the public storefront. Give a clear manual suspension reason.',
                confirmLabel: 'Suspend shop',
                onConfirm: run,
                error: 'Failed to suspend shop'
            });
            return;
        }

        await run('');
    };

    const updatePlan = (planName) => {
        const selectedPlan = registry.plans.find(plan => plan.key === planName);
        openReasonModal({
            title: `Change plan to ${selectedPlan?.name || planName}`,
            warning: 'This immediately changes subscription capabilities and may reconcile plan-restricted resources. Billing dates are preserved.',
            confirmLabel: 'Change plan',
            error: 'Failed to update plan',
            onConfirm: async (actionReason) => {
                await API.patch(`/super-admin/shops/${shopId}/plan`, {
                    plan: { name: planName, slug: planName },
                    reason: actionReason
                });
                toast.success('Plan updated');
            }
        });
    };

    const toggleFeature = async (key) => {
        const entitlement = detail?.shop?.featureEntitlements?.[key];
        if (!entitlement?.planAllowed) {
            toast.error('This feature is excluded by the current plan and cannot be enabled with a shop override.');
            return;
        }
        const nextValue = entitlement.shopOverride === false;
        const run = async (actionReason = '') => {
            await API.patch(`/super-admin/shops/${shopId}/feature-flags`, {
                featureFlags: { [key]: nextValue },
                reason: actionReason
            });
            toast.success('Feature flag updated');
            await load();
        };

        if (criticalFeatureKeys.has(key) && nextValue === false) {
            openReasonModal({
                title: 'Disable critical feature',
                warning: `Disabling ${key} can affect the vendor's operations. Add a governance reason.`,
                confirmLabel: 'Disable feature',
                onConfirm: run,
                error: 'Failed to update feature'
            });
            return;
        }

        await run('');
    };

    if (loading) {
        return <div className="mx-auto max-w-7xl p-6 text-sm text-slate-500">Loading shop detail...</div>;
    }

    if (!detail?.shop) {
        return (
            <div className="mx-auto max-w-7xl p-6">
                <EmptyState message="Shop detail not found." />
            </div>
        );
    }

    const { shop, owner, verification, domain, billing, abuseReports = [], recentAuditLogs = [] } = detail;

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link to="/super-admin" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Super Admin
                    </Link>
                    <h1 className="text-2xl font-black text-slate-950">{shop.shopName}</h1>
                    <p className="mt-1 text-sm text-slate-500">{shop.subdomain} · Created {new Date(shop.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateStatus('Approved')} className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50">Approve</button>
                    <button onClick={() => updateStatus('Suspended')} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50">Suspend</button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Status</p><div className="mt-2"><StatusBadge value={shop.approvalStatus} /></div></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Active</p><p className="mt-2 text-lg font-black">{shop.isActive ? 'Yes' : 'No'}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Plan</p><p className="mt-2 text-lg font-black">{billing?.planDisplay || shop.plan?.name || 'Beginner'}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Verification</p><div className="mt-2"><StatusBadge value={verification?.status} /></div></div>
            </div>

            {shop.suspensionReason && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                    <strong>Suspension reason:</strong> {shop.suspensionReason}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="Shop Overview" icon={Building2}>
                    <div className="space-y-3 p-5 text-sm">
                        <p><span className="font-bold text-slate-950">Owner:</span> {owner?.fullName || '-'} / {owner?.email || '-'}</p>
                        <p><span className="font-bold text-slate-950">Subdomain:</span> {shop.subdomain}</p>
                        <p><span className="font-bold text-slate-950">Current status:</span> {shop.approvalStatus}</p>
                        <p><span className="font-bold text-slate-950">Manual suspension protected:</span> {shop.suspensionReason && shop.suspensionReason !== 'Store verification deadline expired. Submit NID verification for Super Admin approval.' ? 'Yes' : 'No'}</p>
                    </div>
                </SectionCard>

                <SectionCard title="Plan and Feature Flags" icon={Flag}>
                    <div className="space-y-4 p-5">
                        <label className="block">
                            <span className="text-sm font-bold text-slate-950">Plan</span>
                            <select value={String(shop.plan?.name || 'Starter').toLowerCase()} onChange={event => updatePlan(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                {registry.plans.map(plan => (
                                    <option key={plan.key} value={plan.key}>{plan.name}</option>
                                ))}
                            </select>
                        </label>
                        <p className="text-xs leading-5 text-slate-500">
                            Green means effectively enabled. Gray plan-excluded features cannot be enabled by shop overrides.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {registry.features
                                .filter(feature => feature.overridePolicy === 'disable_only')
                                .map(({ key, label }) => {
                                    const entitlement = shop.featureEntitlements?.[key];
                                    const enabled = shop.effectiveFeatures?.[key] === true;
                                    const planAllowed = entitlement?.planAllowed === true;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => toggleFeature(key)}
                                            disabled={!planAllowed}
                                            title={!planAllowed
                                                ? `${label} is excluded by ${billing?.planDisplay || 'the current plan'}`
                                                : enabled ? 'Click to disable for this shop' : 'Click to enable the plan-allowed feature'}
                                            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                                enabled
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : planAllowed
                                                        ? 'bg-amber-50 text-amber-700'
                                                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Verification Summary" icon={BadgeCheck}>
                    <div className="space-y-3 p-5 text-sm">
                        <p><span className="font-bold text-slate-950">Status:</span> {verification?.status || '-'}</p>
                        <p><span className="font-bold text-slate-950">Deadline:</span> {verification?.verificationDeadline ? new Date(verification.verificationDeadline).toLocaleString() : '-'}</p>
                        <p><span className="font-bold text-slate-950">Days left:</span> {verification?.daysLeft ?? '-'}</p>
                        <p><span className="font-bold text-slate-950">Submitted:</span> {verification?.submittedAt ? new Date(verification.submittedAt).toLocaleString() : '-'}</p>
                        <p><span className="font-bold text-slate-950">Approved:</span> {verification?.approvedAt ? new Date(verification.approvedAt).toLocaleString() : '-'}</p>
                        <p><span className="font-bold text-slate-950">Rejected:</span> {verification?.rejectedAt ? new Date(verification.rejectedAt).toLocaleString() : '-'}</p>
                        {verification?._id && <Link to="/super-admin/vendor-verifications" className="inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-900">Open verification queue</Link>}
                    </div>
                </SectionCard>

                <SectionCard title="Trusted Badge Summary" icon={ShieldCheck}>
                    <div className="space-y-3 p-5 text-sm">
                        <p><span className="font-bold text-slate-950">Badge status:</span> {shop.badgeStatus || 'none'}</p>
                        <p><span className="font-bold text-slate-950">Badge type:</span> {shop.badgeType || '-'}</p>
                        <p><span className="font-bold text-slate-950">Approved:</span> {shop.badgeApprovedAt ? new Date(shop.badgeApprovedAt).toLocaleString() : '-'}</p>
                        <p><span className="font-bold text-slate-950">Expires:</span> {shop.badgeExpiresAt ? new Date(shop.badgeExpiresAt).toLocaleString() : '-'}</p>
                        <p><span className="font-bold text-slate-950">Revoked:</span> {shop.badgeRevokedAt ? new Date(shop.badgeRevokedAt).toLocaleString() : '-'}</p>
                        {shop.badgeRevokedReason && <p><span className="font-bold text-slate-950">Revocation reason:</span> {shop.badgeRevokedReason}</p>}
                        <Link to="/super-admin/badges" className="inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-900">Open badge queue</Link>
                    </div>
                </SectionCard>

                <SectionCard title="Domain Summary" icon={Globe}>
                    <div className="space-y-3 p-5 text-sm">
                        <p><span className="font-bold text-slate-950">Domain:</span> {domain?.domain || '-'}</p>
                        <p><span className="font-bold text-slate-950">Status:</span> {domain?.status || '-'}</p>
                        <p><span className="font-bold text-slate-950">Admin note:</span> {domain?.adminNote || '-'}</p>
                        <p><span className="font-bold text-slate-950">Last checked:</span> {domain?.lastCheckedAt ? new Date(domain.lastCheckedAt).toLocaleString() : '-'}</p>
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="Abuse Summary" icon={ShieldAlert}>
                    <div className="divide-y divide-slate-100">
                        {abuseReports.length === 0 ? <EmptyState message="No abuse reports for this shop." /> : abuseReports.map(report => (
                            <div key={report._id} className="px-5 py-4 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-bold text-slate-950">{report.reason}</p>
                                    <StatusBadge value={report.status} />
                                </div>
                                <p className="mt-1 line-clamp-2 text-slate-500">{report.details}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title="Recent Platform Activity" icon={ClipboardList}>
                    <div className="divide-y divide-slate-100">
                        {recentAuditLogs.length === 0 ? <EmptyState message="No platform audit logs for this shop yet." /> : recentAuditLogs.map(log => (
                            <div key={log._id} className="px-5 py-4 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-bold text-slate-950">{log.message}</p>
                                    <StatusBadge value={log.severity} />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{log.actorEmail || 'System'} · {new Date(log.createdAt).toLocaleString()}</p>
                                {log.reason && <p className="mt-1 text-xs text-slate-500">Reason: {log.reason}</p>}
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>

            <ReasonModal
                open={Boolean(reasonModal)}
                title={reasonModal?.title}
                warning={reasonModal?.warning}
                reason={reason}
                setReason={setReason}
                onCancel={() => setReasonModal(null)}
                onConfirm={confirmReasonAction}
                confirmLabel={reasonModal?.confirmLabel}
                loading={actionLoading}
            />
        </div>
    );
};

export default ShopDetail;
