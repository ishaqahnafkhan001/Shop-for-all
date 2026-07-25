import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Package, Store, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/api';

const BeginnerGrowthCard = ({ user, stats = {} }) => {
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState(null);
    const [promptLoaded, setPromptLoaded] = useState(false);
    const [actionPending, setActionPending] = useState(false);

    useEffect(() => {
        if (user?.planAccess?.planKey !== 'beginner') return undefined;
        let active = true;
        API.get('/admin/billing/conversion/prompt', { params: { surface: 'overview' } })
            .then(response => {
                if (active) setPrompt(response.data?.data?.prompt || null);
            })
            .catch(() => {
                if (active) setPrompt(null);
            })
            .finally(() => {
                if (active) setPromptLoaded(true);
            });
        return () => {
            active = false;
        };
    }, [user?.planAccess?.planKey]);

    if (user?.planAccess?.planKey !== 'beginner') return null;

    const productUsage = user.planAccess?.usageDetails?.products || {};
    const used = Number(productUsage.used ?? stats.totalProducts ?? 0);
    const limit = Number(productUsage.limit || 25);
    const completedOrders = Number(stats.completedOrders || 0);
    const verificationComplete = user?.shop?.verificationStatus === 'approved';

    const fallbackRecommendation = verificationComplete
        ? 'Your essentials are ready. Add products, receive orders, and grow at your own pace.'
        : 'Complete verification to keep your store active and ready to receive orders.';
    const recommendation = prompt?.message || fallbackRecommendation;
    const title = prompt?.title || 'Store growth';
    const canDismiss = Boolean(prompt?.category && !prompt?.blocking);

    const dismissPrompt = async () => {
        if (!canDismiss || actionPending) return;
        setActionPending(true);
        try {
            await API.post(
                `/admin/billing/conversion/prompts/${encodeURIComponent(prompt.category)}/dismiss`,
                { milestoneKey: prompt.milestoneKey || '' }
            );
            setPrompt(null);
        } finally {
            setActionPending(false);
        }
    };

    const handleAction = async () => {
        if (actionPending) return;
        if (prompt?.actionPath) {
            navigate(prompt.actionPath);
            return;
        }
        if (!prompt?.upgrade) {
            navigate('/dashboard/billing');
            return;
        }

        setActionPending(true);
        try {
            const response = await API.post('/admin/billing/upgrade-intents', {
                capability: prompt.upgrade.capability || '',
                limitKey: prompt.upgrade.limitKey || '',
                returnTo: '/dashboard'
            });
            const token = response.data?.data?.token;
            navigate(token
                ? `/dashboard/billing?intent=${encodeURIComponent(token)}`
                : '/dashboard/billing');
        } catch {
            navigate('/dashboard/billing');
        } finally {
            setActionPending(false);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Beginner plan</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{recommendation}</p>
                </div>
                <div className="flex items-center gap-2">
                    {canDismiss && (
                        <button
                            type="button"
                            onClick={dismissPrompt}
                            disabled={actionPending}
                            aria-label="Dismiss this recommendation"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    {(prompt?.actionPath || prompt?.upgrade || !promptLoaded) && (
                        <button
                            type="button"
                            onClick={handleAction}
                            disabled={actionPending || !promptLoaded}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                        >
                            {actionPending || !promptLoaded
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <ArrowRight className="h-4 w-4" />}
                            {prompt?.actionLabel || (prompt?.upgrade?.recommendedPlan
                                ? `View ${prompt.upgrade.recommendedPlan} plan`
                                : 'View plans')}
                        </button>
                    )}
                </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                    <Package className="h-4 w-4 text-slate-500" />
                    <p className="mt-2 text-xs font-bold text-slate-500">Products</p>
                    <p className="text-base font-black text-slate-900">{used} / {limit}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    <p className="mt-2 text-xs font-bold text-slate-500">Completed orders</p>
                    <p className="text-base font-black text-slate-900">{completedOrders}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                    <CheckCircle2 className={`h-4 w-4 ${verificationComplete ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <p className="mt-2 text-xs font-bold text-slate-500">Verification</p>
                    <p className="text-base font-black text-slate-900">{verificationComplete ? 'Complete' : 'Required'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                    <Store className="h-4 w-4 text-slate-500" />
                    <p className="mt-2 text-xs font-bold text-slate-500">Storefront</p>
                    <p className="text-base font-black text-slate-900">Beginner layout</p>
                </div>
            </div>
        </section>
    );
};

export default BeginnerGrowthCard;
