import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CreditCard, RefreshCw } from 'lucide-react';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasPlatformPermission } from '../../utils/platformAccess.js';
import { EmptyState, SectionCard } from './SuperAdminComponents.jsx';

const defaultPlanForm = {
    name: 'Starter',
    slug: 'starter',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: 'BDT',
    productLimit: 100,
    staffLimit: 1,
    limits: {
        productCount: 100,
        staffAccounts: 1,
        aiProductCreationsPerWeek: 10,
        imagesPerProduct: 5,
        activityLogRetentionDays: 7
    },
    features: {},
    storeBuilderAccess: 'limited'
};

const defaultRegistry = {
    plans: [
        { key: 'beginner', name: 'Beginner' },
        { key: 'starter', name: 'Starter' },
        { key: 'growth', name: 'Growth' },
        { key: 'pro', name: 'Pro' }
    ],
    features: [],
    storeBuilderAccess: ['none', 'limited', 'full']
};

const formatMoney = (value) => `BDT ${(Number(value) || 0).toLocaleString()}`;
const toPlanForm = (plan) => {
    const limits = { ...defaultPlanForm.limits, ...(plan.limits || {}) };
    return {
        ...defaultPlanForm,
        ...plan,
        slug: plan.slug,
        name: plan.name,
        productLimit: limits.productCount,
        staffLimit: limits.staffAccounts,
        limits,
        features: { ...defaultPlanForm.features, ...(plan.features || {}) },
        storeBuilderAccess: plan.storeBuilderAccess || 'limited'
    };
};

const SuperAdminPlans = () => {
    const { user } = useAuth();
    const canManage = hasPlatformPermission(user, 'billing.plans.manage');
    const [plans, setPlans] = useState([]);
    const [registry, setRegistry] = useState(defaultRegistry);
    const [planForm, setPlanForm] = useState(defaultPlanForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const editPlan = (plan) => setPlanForm(toPlanForm(plan));

    useEffect(() => {
        const controller = new AbortController();
        API.get('/super-admin/plans', { signal: controller.signal })
            .then(({ data }) => {
                const nextPlans = data.data || [];
                setPlans(nextPlans);
                setRegistry(previous => ({ ...previous, ...(data.registry || {}) }));
                if (nextPlans.length > 0) {
                    setPlanForm(previous => toPlanForm(
                        nextPlans.find(plan => plan.slug === previous.slug) || nextPlans[0]
                    ));
                }
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error('Plan registry could not be refreshed');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [refreshVersion]);

    const setPlanLimit = (key, rawValue) => {
        const value = rawValue === '' ? null : Math.max(0, Number(rawValue));
        setPlanForm(previous => ({
            ...previous,
            ...(key === 'productCount' ? { productLimit: value } : {}),
            ...(key === 'staffAccounts' ? { staffLimit: value } : {}),
            limits: { ...previous.limits, [key]: value }
        }));
    };

    const savePlan = async (event) => {
        event.preventDefault();
        if (!canManage || saving) return;
        setSaving(true);
        try {
            await API.post('/super-admin/plans', {
                ...planForm,
                expectedVersion: planForm.__v
            });
            toast.success('Plan saved');
            setRefreshVersion(version => version + 1);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save plan');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950">Vendor Plans</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage pricing, limits, and authoritative plan capabilities.</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setLoading(true);
                        setRefreshVersion(version => version + 1);
                    }}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
                <SectionCard title="Plans" icon={CreditCard}>
                    <div className="space-y-2 p-4">
                        {loading && plans.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">Loading plans...</p>
                        ) : plans.length === 0 ? (
                            <EmptyState message="No plans are configured." />
                        ) : plans.map(plan => (
                            <button
                                key={plan._id}
                                type="button"
                                onClick={() => editPlan(plan)}
                                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                    planForm.slug === plan.slug
                                        ? 'border-indigo-200 bg-indigo-50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                            >
                                <span className="block font-black text-slate-950">{plan.name}</span>
                                <span className="mt-1 block text-xs text-slate-500">
                                    {formatMoney(plan.monthlyPrice)} monthly · {formatMoney(plan.yearlyPrice)} yearly
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                    Products: {plan.limits?.productCount ?? 'Unlimited'} · Staff: {plan.limits?.staffAccounts ?? 'Unlimited'}
                                </span>
                            </button>
                        ))}
                    </div>
                </SectionCard>

                <form onSubmit={savePlan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                        <h2 className="font-black text-slate-950">Edit {planForm.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Disabled plan capabilities cannot be enabled by individual shop overrides.
                        </p>
                    </div>
                    <fieldset disabled={!canManage || saving} className="space-y-5 disabled:opacity-70">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <select
                                value={planForm.slug}
                                onChange={event => {
                                    const selected = plans.find(plan => plan.slug === event.target.value);
                                    if (selected) editPlan(selected);
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                            >
                                {registry.plans.map(plan => <option key={plan.key} value={plan.key}>{plan.name}</option>)}
                            </select>
                            <input type="number" min="0" value={planForm.monthlyPrice} onChange={event => setPlanForm(previous => ({ ...previous, monthlyPrice: Number(event.target.value) }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Monthly price" />
                            <input type="number" min="0" value={planForm.yearlyPrice ?? ''} onChange={event => setPlanForm(previous => ({ ...previous, yearlyPrice: Number(event.target.value) }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Yearly price" />
                            {[
                                ['productCount', 'Product limit'],
                                ['staffAccounts', 'Staff limit'],
                                ['aiProductCreationsPerWeek', 'Weekly AI limit'],
                                ['imagesPerProduct', 'Images per product'],
                                ['activityLogRetentionDays', 'Activity log days']
                            ].map(([key, placeholder]) => (
                                <input
                                    key={key}
                                    type="number"
                                    min="0"
                                    value={planForm.limits?.[key] ?? ''}
                                    onChange={event => setPlanLimit(key, event.target.value)}
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                                    placeholder={`${placeholder} (blank = unlimited)`}
                                    title={placeholder}
                                />
                            ))}
                            <select value={planForm.storeBuilderAccess} onChange={event => setPlanForm(previous => ({ ...previous, storeBuilderAccess: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                                {registry.storeBuilderAccess.map(access => (
                                    <option key={access} value={access}>
                                        {access === 'none' ? 'No Store Builder' : `${access[0].toUpperCase() + access.slice(1)} Store Builder`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-slate-900">Capabilities</h3>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {registry.features.filter(feature => feature.editableCommercially).map(feature => (
                                    <label key={feature.key} className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                                        <span>
                                            {feature.label}
                                            <span className="block text-xs font-normal text-slate-400">{feature.category}</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(planForm.features?.[feature.key])}
                                            onChange={event => setPlanForm(previous => ({
                                                ...previous,
                                                features: { ...previous.features, [feature.key]: event.target.checked }
                                            }))}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        {canManage ? (
                            <button disabled={saving} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                                {saving ? 'Saving...' : 'Save plan'}
                            </button>
                        ) : (
                            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                You have read-only billing access. Plan changes require plan-management permission.
                            </p>
                        )}
                    </fieldset>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminPlans;
