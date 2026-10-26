import PaginationBar from '../../components/ui/PaginationBar.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    ArrowRight,
    BadgeCheck,
    CalendarClock,
    Check,
    ChevronRight,
    CircleDollarSign,
    Clock3,
    CreditCard,
    HelpCircle,
    History,
    Image as ImageIcon,
    Info,
    Loader2,
    Package,
    ReceiptText,
    Send,
    ShieldCheck,
    Sparkles,
    Users,
    WalletCards,
    X
} from 'lucide-react';
import API from '../../api/api';
import { AdminErrorState, AdminLoadingState } from '../../components/ui/AdminState.jsx';

const PLAN_ORDER = ['beginner', 'starter', 'growth', 'pro'];

const providerLabels = {
    manual_bkash: 'bKash',
    manual_nagad: 'Nagad',
    manual_bank: 'Bank transfer',
    other: 'Other'
};

const formatPlanLimit = (value) =>
    value === null ? 'Unlimited' : Number(value || 0).toLocaleString();

const money = (value) => `৳${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
    if (!value) return 'Not set';

    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatEventName = (value) =>
    String(value || 'System event')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ');

const getEntityId = (entity) => String(entity?.id || entity?._id || '');

const getUsagePercent = (used, limit) => {
    if (limit === null || limit === undefined || Number(limit) <= 0) return 0;
    return Math.min(100, Math.max(0, (Number(used || 0) / Number(limit)) * 100));
};

const formatUsage = (used, limit) =>
    `${Number(used || 0).toLocaleString()} / ${
        limit === null ? 'Unlimited' : Number(limit || 0).toLocaleString()
    }`;

const buildPlanFeatureList = (plan = {}) => {
    const limits = plan.limits || {};
    const features = plan.features || {};

    return [
        `${formatPlanLimit(limits.productCount)} products`,
        `${formatPlanLimit(limits.imagesPerProduct)} images per product`,
        'Unlimited orders and returns',
        limits.staffAccounts > 0
            ? `${formatPlanLimit(limits.staffAccounts)} staff account${
                limits.staffAccounts === 1 ? '' : 's'
            }`
            : 'Owner-operated store',
        (limits.aiProductCreationsPerWeek === null || limits.aiProductCreationsPerWeek > 0)
            ? `${formatPlanLimit(limits.aiProductCreationsPerWeek)} AI products weekly`
            : null,
        plan.storeBuilderAccess === 'none'
            ? 'Fixed responsive storefront'
            : `${plan.storeBuilderAccess === 'full' ? 'Full' : 'Limited'} Store Builder`,
        features.activityLogs
            ? `${formatPlanLimit(limits.activityLogRetentionDays)}-day activity logs`
            : null,
        features.analytics ? 'Sales analytics' : null,
        features.growthCenter ? 'Growth Center' : null,
        features.customDomain ? 'Custom domain' : 'ScaleUp subdomain',
        features.customerSection ? 'Customer management' : null,
        features.notifications ? 'Notification Center' : null,
        features.lowStockAlerts ? 'Low-stock alerts' : null,
        features.scheduledSales ? 'Scheduled sales' : null,
        features.scheduledProductPublishing ? 'Scheduled product publishing' : null
    ].filter(Boolean);
};

const statusClass = (status) =>
    ({
        trialing: 'bg-sky-50 text-sky-700 ring-sky-200/80',
        pending_approval: 'bg-indigo-50 text-indigo-700 ring-indigo-200/80',
        active: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
        grace: 'bg-amber-50 text-amber-700 ring-amber-200/80',
        past_due: 'bg-amber-50 text-amber-700 ring-amber-200/80',
        suspended: 'bg-rose-50 text-rose-700 ring-rose-200/80',
        cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
        unpaid: 'bg-slate-100 text-slate-600 ring-slate-200',
        submitted: 'bg-indigo-50 text-indigo-700 ring-indigo-200/80',
        paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
        rejected: 'bg-rose-50 text-rose-700 ring-rose-200/80',
        pending: 'bg-amber-50 text-amber-700 ring-amber-200/80',
        approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
        verified: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
    }[status] || 'bg-slate-100 text-slate-600 ring-slate-200');

const StatusBadge = ({ value }) => (
    <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold capitalize ring-1 ${statusClass(
            value
        )}`}
    >
        {String(value || '-').replace(/_/g, ' ')}
    </span>
);

const Panel = ({ children, className = '', ...props }) => (
    <section
        {...props}
        className={`rounded-[22px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02),0_8px_24px_rgba(15,23,42,0.04)] ${className}`}
    >
        {children}
    </section>
);

const SectionHeading = ({ eyebrow, title, description, icon: Icon, action }) => (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
            {Icon && (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
            )}

            <div className="min-w-0">
                {eyebrow && (
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-600">
                        {eyebrow}
                    </p>
                )}
                <h2 className="text-lg font-black tracking-[-0.02em] text-slate-950">{title}</h2>
                {description && (
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
                )}
            </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
    </div>
);

const MetricCard = ({ label, value, helper, icon: Icon, accent = 'slate' }) => {
    const accentClasses = {
        slate: 'border-slate-200 bg-slate-50 text-slate-600',
        indigo: 'border-indigo-100 bg-indigo-50 text-indigo-600',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600',
        amber: 'border-amber-100 bg-amber-50 text-amber-600'
    };

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                        {label}
                    </p>
                    <p className="mt-1.5 truncate text-[17px] font-black tracking-[-0.02em] text-slate-950">
                        {value}
                    </p>
                    {helper && <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{helper}</p>}
                </div>

                {Icon && (
                    <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
                            accentClasses[accent] || accentClasses.slate
                        }`}
                    >
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </div>
                )}
            </div>
        </div>
    );
};

const UsageCard = ({ label, used, limit, helper, icon: Icon, displayValue }) => {
    const percent = getUsagePercent(used, limit);
    const constrained = limit !== null && limit !== undefined && Number(limit) > 0;
    const critical = constrained && percent >= 90;
    const warning = constrained && percent >= 75 && percent < 90;

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                        {label}
                    </p>
                    <p className="mt-1.5 text-base font-black text-slate-950">
                        {displayValue || formatUsage(used, limit)}
                    </p>
                </div>

                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
            </div>

            {constrained && (
                <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full rounded-full transition-[width] duration-500 ${
                                critical
                                    ? 'bg-rose-500'
                                    : warning
                                        ? 'bg-amber-500'
                                        : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold">
                        <span
                            className={
                                critical
                                    ? 'text-rose-600'
                                    : warning
                                        ? 'text-amber-600'
                                        : 'text-slate-400'
                            }
                        >
                            {Math.round(percent)}% used
                        </span>
                        <span className="text-slate-400">{helper}</span>
                    </div>
                </div>
            )}

            {!constrained && helper && (
                <p className="mt-3 text-[11px] font-medium text-slate-400">{helper}</p>
            )}
        </div>
    );
};

const BillingBanner = ({ subscription, latestInvoice }) => {
    if (!subscription) return null;

    const pendingApproval =
        subscription.paymentReviewStatus === 'pending_approval' ||
        subscription.status === 'pending_approval';

    if (pendingApproval) {
        return (
            <div className="relative overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-violet-50/70 to-white p-5">
                <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-indigo-200/20 blur-2xl" />
                <div className="relative flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                        <CreditCard className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                        <p className="font-black text-indigo-950">Payment is being reviewed</p>
                        <p className="mt-1 text-sm leading-6 text-indigo-800/80">
                            Your submission is with the Super Admin. Your current plan access remains available while verification is in progress.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (subscription.status === 'trialing') {
        return (
            <div className="relative overflow-hidden rounded-[22px] border border-sky-200/80 bg-gradient-to-r from-sky-50 via-cyan-50/60 to-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
                            <CalendarClock className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-black text-sky-950">
                                {Math.max(subscription.trialDaysLeft || 0, 0)} days left in your free trial
                            </p>
                            <p className="mt-1 text-sm leading-6 text-sky-800/80">
                                Beginner features remain available until the trial ends. Choose a plan when you are ready.
                            </p>
                        </div>
                    </div>

                    <a
                        href="#plans"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                    >
                        Compare plans
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                </div>
            </div>
        );
    }

    if (['past_due', 'grace', 'suspended'].includes(subscription.status)) {
        return (
            <div className="relative overflow-hidden rounded-[22px] border border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-600 text-white shadow-lg shadow-amber-600/20">
                            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-black text-amber-950">
                                {subscription.status === 'suspended'
                                    ? 'Store access is restricted for billing'
                                    : 'Your billing needs attention'}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-amber-800/80">
                                Submit a manual payment for verification. Your products, orders, customers, and media stay safely stored.
                            </p>
                        </div>
                    </div>

                    {latestInvoice && (
                        <a
                            href="#payment"
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                        >
                            Pay invoice
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

const PlanCard = ({
                      plan,
                      cycle,
                      currentPlanIndex,
                      subscription,
                      creatingPlan,
                      onSelectPlan
                  }) => {
    const targetIndex = PLAN_ORDER.indexOf(plan.key);
    const isCurrent = targetIndex === currentPlanIndex && subscription?.status === 'active';
    const isDowngrade = targetIndex !== -1 && currentPlanIndex !== -1 && targetIndex < currentPlanIndex;
    const isBusy = creatingPlan === plan.name;

    const buttonLabel = isDowngrade
        ? 'Schedule downgrade'
        : isCurrent
            ? (cycle === subscription.billingCycle ? 'Renew current plan' : 'Change billing cycle')
            : 'Choose plan';

    return (
        <article
            className={[
                'relative flex h-full flex-col overflow-hidden rounded-[22px] border p-5 transition duration-200',
                plan.recommended
                    ? 'border-indigo-300 bg-gradient-to-b from-indigo-50/80 via-white to-white shadow-[0_16px_40px_rgba(79,70,229,0.10)]'
                    : 'border-slate-200/90 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg'
            ].join(' ')}
        >
            {plan.recommended && (
                <div className="absolute right-0 top-0 rounded-bl-2xl bg-indigo-600 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">
                    Recommended
                </div>
            )}

            <div className="pr-20">
                <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{plan.name}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                    {isCurrent ? 'Your active subscription' : 'Built for your next stage'}
                </p>
            </div>

            <div className="mt-5 flex items-end gap-1">
                <span className="text-3xl font-black tracking-[-0.04em] text-slate-950">
                    {money(cycle === 'yearly' ? plan.yearly : plan.monthly)}
                </span>
                <span className="pb-1 text-xs font-bold text-slate-400">
                    /{cycle === 'yearly' ? 'year' : 'month'}
                </span>
            </div>

            {cycle === 'yearly' && (
                <p className="mt-2 inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    Two months free
                </p>
            )}

            {plan.badgeEligible && (
                <div className="mt-4 flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs font-semibold leading-5 text-emerald-700">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Eligible to apply for Trusted Badge after requirements are met.</span>
                </div>
            )}

            <div className="my-5 h-px bg-slate-100" />

            <div className="flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                        </span>
                        <span className="leading-5">{feature}</span>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => onSelectPlan(plan)}
                disabled={Boolean(creatingPlan) || subscription?.paymentReviewStatus === 'pending_approval'}
                className={[
                    'mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black outline-none transition',
                    'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
                    plan.recommended && !isCurrent
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 hover:bg-indigo-700 disabled:bg-slate-300'
                        : isCurrent
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300'
                ].join(' ')}
            >
                {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : isCurrent ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                ) : isDowngrade ? (
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                {buttonLabel}
            </button>
        </article>
    );
};

const downloadInvoice = invoice => {
    const lines = [invoice.status === 'paid' ? 'Subscription payment receipt' : 'Subscription invoice',
        `Invoice: ${invoice.invoiceNumber || getEntityId(invoice)}`, `Plan: ${invoice.planName}`,
        `Billing cycle: ${invoice.billingCycle}`, `Amount: BDT ${Number(invoice.amount).toFixed(2)}`,
        `Status: ${invoice.status}`, `Created: ${formatDate(invoice.createdAt)}`,
        `Due: ${formatDate(invoice.dueDate)}`, `Paid: ${formatDate(invoice.paidAt)}`,
        `Purchased period start: ${formatDate(invoice.servicePeriodStart)}`,
        `Purchased period end: ${formatDate(invoice.servicePeriodEnd)}`];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `billing-${String(invoice.invoiceNumber || getEntityId(invoice)).replace(/[^a-zA-Z0-9_-]/g, '-')}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const isPayableInvoice = invoice => ['unpaid', 'rejected'].includes(invoice.status) && (!invoice.dueDate || new Date(invoice.dueDate).getTime() >= Date.now());

const InvoiceList = ({ invoices, onPay }) => (
    <div>
        <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-5 py-3.5">Invoice</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Due</th>
                    <th className="px-5 py-3.5">Paid</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                            No invoices yet. Choose a plan to create your first invoice.
                        </td>
                    </tr>
                ) : (
                    invoices.map((invoice) => (
                        <tr key={getEntityId(invoice)} className="transition hover:bg-slate-50/70">
                            <td className="px-5 py-4">
                                <p className="font-bold text-slate-950">{invoice.invoiceNumber || 'Invoice'}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{invoice.planName || 'Subscription'}</p>
                            </td>
                            <td className="px-5 py-4 font-bold text-slate-700">{money(invoice.amount)}</td>
                            <td className="px-5 py-4">
                                <StatusBadge value={invoice.status} />
                            </td>
                            <td className="px-5 py-4 text-slate-600">{formatDate(invoice.dueDate)}</td>
                            <td className="px-5 py-4 text-slate-600">{formatDate(invoice.paidAt)}</td>
                            <td className="px-5 py-4 text-right">
                                <button type="button" onClick={() => downloadInvoice(invoice)} className="mr-3 text-xs font-bold text-indigo-700">Download {invoice.status === 'paid' ? 'receipt' : 'invoice'}</button>
                                {isPayableInvoice(invoice) && (
                                    <button
                                        type="button"
                                        onClick={() => onPay(invoice)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        Submit payment
                                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
            {invoices.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                    No invoices yet. Choose a plan to create your first invoice.
                </p>
            ) : (
                invoices.map((invoice) => (
                    <div key={getEntityId(invoice)} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-black text-slate-950">{invoice.invoiceNumber || 'Invoice'}</p>
                                <p className="mt-1 text-xs text-slate-500">{invoice.planName || 'Subscription'}</p>
                            </div>
                            <StatusBadge value={invoice.status} />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                            <div>
                                <p className="font-bold uppercase text-slate-400">Amount</p>
                                <p className="mt-1 font-black text-slate-800">{money(invoice.amount)}</p>
                            </div>
                            <div>
                                <p className="font-bold uppercase text-slate-400">Due</p>
                                <p className="mt-1 font-semibold text-slate-700">{formatDate(invoice.dueDate)}</p>
                            </div>
                            <div>
                                <p className="font-bold uppercase text-slate-400">Paid</p>
                                <p className="mt-1 font-semibold text-slate-700">{formatDate(invoice.paidAt)}</p>
                            </div>
                        </div>

                        <button type="button" onClick={() => downloadInvoice(invoice)} className="mt-3 text-xs font-bold text-indigo-700">Download {invoice.status === 'paid' ? 'receipt' : 'invoice'}</button>
                        {isPayableInvoice(invoice) && (
                            <button
                                type="button"
                                onClick={() => onPay(invoice)}
                                className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700"
                            >
                                Submit payment
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
    </div>
);

const Billing = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [current, setCurrent] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [payableInvoices, setPayableInvoices] = useState([]);
    const [selectedInvoiceCache, setSelectedInvoiceCache] = useState(null);
    const [invoicePage, setInvoicePage] = useState(1);
    const [paymentPage, setPaymentPage] = useState(1);
    const [payablePage, setPayablePage] = useState(1);
    const [pages, setPages] = useState({});
    const [sectionErrors, setSectionErrors] = useState([]);
    const loadEpoch = useRef(0);
    const invoiceRequest = useRef(null);
    const [payments, setPayments] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [cycle, setCycle] = useState('monthly');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [creatingPlan, setCreatingPlan] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [upgradeIntent, setUpgradeIntent] = useState(null);
    const [downgradePreview, setDowngradePreview] = useState(null);
    const [retainedProductIds, setRetainedProductIds] = useState([]);
    const [downgradePending, setDowngradePending] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        provider: 'manual_bkash',
        transactionId: '',
        senderNumber: '',
        amount: '',
        screenshotUrl: ''
    });

    const load = useCallback(async () => {
        const epoch = ++loadEpoch.current;
        setLoading(true);
        setError('');

        try {
            const results = await Promise.allSettled([
                API.get('/admin/billing/current'),
                API.get('/admin/billing/invoices', { params: { limit: 20, page: invoicePage } }),
                API.get('/admin/billing/payments', { params: { limit: 20, page: paymentPage } }),
                API.get('/admin/billing/timeline', { params: { limit: 20 } }),
                API.get('/admin/billing/invoices', { params: { payable: true, limit: 20, page: payablePage } })
            ]);
            if (epoch !== loadEpoch.current) return;
            if (results[0].status === 'rejected') throw results[0].reason;
            const bodies = results.map(result => result.status === 'fulfilled' ? result.value.data : { data: [] });
            setCurrent(bodies[0].data || {});
            setInvoices(bodies[1].data || []);
            setPayments(bodies[2].data || []);
            setTimeline(bodies[3].data || []);
            setPayableInvoices(bodies[4].data || []);
            setPages({ invoices: bodies[1].pagination, payments: bodies[2].pagination, payable: bodies[4].pagination });
            setSectionErrors(results.flatMap((result, index) => result.status === 'rejected' ? [`${['Subscription', 'Invoice history', 'Payment history', 'Timeline', 'Payable invoices'][index]} could not load. Retry this page.`] : []));
            const payable = bodies[4].data?.[0];
            if (payable) {
                setSelectedInvoiceId(previous => previous || getEntityId(payable));
                setSelectedInvoiceCache(previous => previous || payable);
                setPaymentForm(previous => ({ ...previous, amount: previous.amount || String(payable.amount) }));
            }
        } catch (err) {
            if (epoch !== loadEpoch.current) return;
            setError(err.response?.data?.error || 'Failed to load billing.');
        } finally {
            if (epoch === loadEpoch.current) setLoading(false);
        }
    }, [invoicePage, paymentPage, payablePage]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    useEffect(() => {
        const token = searchParams.get('intent');
        if (!token) return undefined;

        let active = true;

        API.get(`/admin/billing/upgrade-intents/${encodeURIComponent(token)}`)
            .then((response) => {
                if (!active) return;

                const intent = response.data?.data || null;
                setUpgradeIntent(intent);

                if (intent?.status === 'completed' && intent?.returnTo) {
                    navigate(intent.returnTo, { replace: true });
                }
            })
            .catch(() => {
                if (active) setUpgradeIntent(null);
            });

        return () => {
            active = false;
        };
    }, [navigate, searchParams]);

    useEffect(() => {
        if (!downgradePreview || typeof document === 'undefined') return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !downgradePending) {
                setDowngradePreview(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [downgradePreview, downgradePending]);

    const latestInvoice = current?.latestInvoice;
    const subscription = current?.subscription;
    const billingDisplay = current?.billingDisplay || {};
    const planAccess = current?.planAccess || {};
    const limits = planAccess.limits || {};
    const usage = planAccess.usage || {};
    const usageWarnings = planAccess.warnings || [];
    const recommendedPlanKey = upgradeIntent?.recommendedPlan;

    const plans = useMemo(
        () =>
            (current?.availablePlans || []).map((plan) => ({
                ...plan,
                monthly: plan.monthlyPrice,
                yearly: plan.yearlyPrice,
                recommended: recommendedPlanKey
                    ? plan.key === recommendedPlanKey
                    : plan.key === 'growth',
                features: buildPlanFeatureList(plan)
            })),
        [current?.availablePlans, recommendedPlanKey]
    );

    const currentPlanIndex = PLAN_ORDER.indexOf(planAccess.planKey);

    const paymentCandidates = useMemo(() => Array.from(new Map([...payableInvoices, ...invoices.filter(isPayableInvoice), ...(selectedInvoiceCache ? [selectedInvoiceCache] : [])].filter(isPayableInvoice).map(invoice => [getEntityId(invoice), invoice])).values()), [payableInvoices, invoices, selectedInvoiceCache]);
    const selectedInvoice = paymentCandidates.find(invoice => getEntityId(invoice) === selectedInvoiceId);

    const createInvoice = async (planName) => {
        setCreatingPlan(planName);

        try {
            await API.post('/admin/billing/events/upgrade-clicked', { planName }).catch(
                () => null
            );

            const choice = `${planName}:${cycle}`;
            if (invoiceRequest.current?.choice !== choice) invoiceRequest.current = { choice, key: crypto.randomUUID() };
            const response = await API.post('/admin/billing/invoices', {
                requestKey: invoiceRequest.current.key,
                planName,
                billingCycle: cycle,
                upgradeIntentToken: searchParams.get('intent') || undefined
            });

            const invoice = response.data.data;
            invoiceRequest.current = null;
            toast.success(`${planName} invoice ready`);

            await load();

            setSelectedInvoiceId(getEntityId(invoice));
            setSelectedInvoiceCache(invoice);
            setPaymentForm((previous) => ({
                ...previous,
                amount: String(invoice?.amount || '')
            }));

            document
                .getElementById('payment')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create invoice');
        } finally {
            setCreatingPlan('');
        }
    };

    const previewDowngrade = async (plan) => {
        setCreatingPlan(plan.name);

        try {
            const response = await API.post('/admin/billing/downgrade/preview', {
                planKey: plan.key
            });

            const preview = response.data?.data;
            setDowngradePreview(preview);
            setRetainedProductIds(
                (preview?.availableProducts || [])
                    .filter((product) => product.selectedByDefault)
                    .map((product) => String(product.id))
            );
        } catch (err) {
            toast.error(
                err.response?.data?.error || 'Unable to preview this downgrade'
            );
        } finally {
            setCreatingPlan('');
        }
    };

    const handlePlanSelection = (plan) => {
        const targetIndex = PLAN_ORDER.indexOf(plan.key);

        if (
            targetIndex !== -1 &&
            currentPlanIndex !== -1 &&
            targetIndex < currentPlanIndex
        ) {
            previewDowngrade(plan);
            return;
        }

        createInvoice(plan.name);
    };

    const toggleRetainedProduct = (productId) => {
        if (!downgradePreview) return;

        const id = String(productId);

        setRetainedProductIds((currentIds) => {
            if (currentIds.includes(id)) {
                return currentIds.filter((value) => value !== id);
            }

            if (
                downgradePreview.productLimit !== null &&
                currentIds.length >= Number(downgradePreview.productLimit)
            ) {
                toast.error(
                    `Choose no more than ${downgradePreview.productLimit} products`
                );
                return currentIds;
            }

            return [...currentIds, id];
        });
    };

    const scheduleDowngrade = async () => {
        if (!downgradePreview || downgradePending) return;

        if (
            downgradePreview.requiresProductSelection &&
            retainedProductIds.length === 0
        ) {
            toast.error('Choose the products you want to keep active');
            return;
        }

        setDowngradePending(true);

        try {
            await API.post('/admin/billing/downgrade/schedule', {
                planKey: downgradePreview.targetPlan.key,
                retainedProductIds
            });

            toast.success(
                `Downgrade to ${downgradePreview.targetPlan.name} scheduled`
            );

            setDowngradePreview(null);
            await load();
        } catch (err) {
            toast.error(
                err.response?.data?.error || 'Unable to schedule this downgrade'
            );
        } finally {
            setDowngradePending(false);
        }
    };

    const cancelDowngrade = async () => {
        setDowngradePending(true);

        try {
            await API.post('/admin/billing/downgrade/cancel');
            toast.success('Scheduled downgrade cancelled');
            await load();
        } catch (err) {
            toast.error(
                err.response?.data?.error || 'Unable to cancel this downgrade'
            );
        } finally {
            setDowngradePending(false);
        }
    };

    const selectInvoiceForPayment = (invoice) => {
        setSelectedInvoiceId(getEntityId(invoice));
        setSelectedInvoiceCache(invoice);
        setPaymentForm((previous) => ({
            ...previous,
            amount: String(invoice?.amount || '')
        }));

        document
            .getElementById('payment')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const submitPayment = async (event) => {
        event.preventDefault();

        if (!selectedInvoice || !['unpaid', 'rejected'].includes(selectedInvoice.status)) {
            toast.error('Choose an unpaid invoice first');
            return;
        }

        if (!paymentForm.transactionId.trim()) {
            toast.error('Transaction ID is required');
            return;
        }

        setSubmitting(true);

        try {
            const response = await API.post(
                `/admin/billing/invoices/${selectedInvoiceId}/submit-payment`,
                {
                    ...paymentForm,
                    amount: Number(selectedInvoice.amount)
                }
            );

            if (response.data?.data?.status === 'rejected') {
                toast.error('This transaction was already rejected. Contact billing support if the transfer was correct; do not pay again without checking.');
                return;
            }
            toast.success('Payment details received. Check the payment status below.');
            setSelectedInvoiceId('');
            setSelectedInvoiceCache(null);

            setPaymentForm({
                provider: 'manual_bkash',
                transactionId: '',
                senderNumber: '',
                amount: '',
                screenshotUrl: ''
            });

            await load();
        } catch (err) {
            toast.error(
                err.response?.data?.error || 'Failed to submit payment'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
                <AdminLoadingState
                    title="Loading billing"
                    description="We are checking your subscription, invoices, usage, and manual payment status."
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
                <AdminErrorState
                    title="Billing could not load"
                    description={error}
                    action={
                        <button
                            type="button"
                            onClick={load}
                            className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                        >
                            Try again
                        </button>
                    }
                />
            </div>
        );
    }

    const currentPlanName =
        billingDisplay.displayPlan ||
        current?.displayPlan ||
        current?.plan?.name ||
        'Trial';

    return (
        <div className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent_28%),linear-gradient(to_bottom,#ffffff,#f8fafc_45%,#f8fafc)]">
            <div className="mx-auto max-w-[1440px] space-y-7 px-4 py-7 pb-14 sm:px-6 lg:px-8 lg:py-9">
                <header className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-950/10 sm:px-7 sm:py-7">
                    <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-200">
                                <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
                                Billing workspace
                            </div>

                            <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                                Plans, usage and payments
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
                                Manage your ScaleUp subscription, compare plans, track limits,
                                review invoices, and submit manual payments from one place.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                                    Current plan
                                </p>
                                <p className="mt-1 font-black text-white">{currentPlanName}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                                    Status
                                </p>
                                <div className="mt-1">
                                    <StatusBadge value={subscription?.status} />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <BillingBanner
                    subscription={subscription}
                    latestInvoice={latestInvoice}
                />

                {subscription?.pendingPlanEffectiveAt &&
                    subscription?.reconciliation?.status !== 'cancelled' && (
                        <div className="flex flex-col gap-4 rounded-[22px] border border-amber-200/80 bg-amber-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                                    <Clock3 className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-black text-amber-950">
                                        Downgrade to {subscription.pendingPlanName} is scheduled
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-amber-800/80">
                                        It takes effect on{' '}
                                        {formatDate(subscription.pendingPlanEffectiveAt)}.
                                        Your retained data remains stored.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={cancelDowngrade}
                                disabled={downgradePending}
                                className="min-h-10 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {downgradePending ? 'Cancelling…' : 'Cancel downgrade'}
                            </button>
                        </div>
                    )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
                    <Panel className="p-5 sm:p-6">
                        <SectionHeading
                            eyebrow="Subscription"
                            title="Current subscription"
                            description="Your live billing state, plan, and renewal timeline."
                            icon={CreditCard}
                            action={<StatusBadge value={subscription?.status} />}
                        />

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                label="Plan"
                                value={currentPlanName}
                                helper={
                                    subscription?.status === 'trialing' &&
                                    billingDisplay.intendedPlanName
                                        ? `Intended: ${billingDisplay.intendedPlanName}`
                                        : billingDisplay.pendingPlanName
                                            ? `Waiting: ${billingDisplay.pendingPlanName}`
                                            : undefined
                                }
                                icon={Sparkles}
                                accent="indigo"
                            />
                            <MetricCard
                                label="Billing cycle"
                                value={subscription?.billingCycle || 'Monthly'}
                                icon={CircleDollarSign}
                                accent="emerald"
                            />
                            <MetricCard
                                label="Trial ends"
                                value={formatDate(subscription?.trialEndsAt)}
                                icon={CalendarClock}
                                accent="amber"
                            />
                            <MetricCard
                                label="Period ends"
                                value={formatDate(
                                    subscription?.currentPeriodEnd ||
                                    subscription?.graceEndsAt
                                )}
                                icon={Clock3}
                            />
                        </div>
                    </Panel>

                    <Panel className="p-5 sm:p-6">
                        <SectionHeading
                            eyebrow="Entitlements"
                            title="Features available now"
                            description={
                                billingDisplay.effectivePlanName
                                    ? `Based on ${billingDisplay.effectivePlanName}.`
                                    : 'Based on your effective plan.'
                            }
                            icon={ShieldCheck}
                        />

                        <div className="mt-5 space-y-2.5">
                            {(current?.plan?.features
                                    ? Object.entries(current.plan.features)
                                    : []
                            )
                                .slice(0, 8)
                                .map(([key, enabled]) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3.5 py-2.5"
                                    >
                                        <span className="min-w-0 truncate text-sm font-semibold capitalize text-slate-600">
                                            {key.replace(/([A-Z])/g, ' $1')}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                                                enabled
                                                    ? 'text-emerald-600'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    enabled
                                                        ? 'bg-emerald-500'
                                                        : 'bg-slate-300'
                                                }`}
                                            />
                                            {enabled ? 'Included' : 'Not included'}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </Panel>
                </div>

                <Panel className="p-5 sm:p-6">
                    <SectionHeading
                        eyebrow="Capacity"
                        title="Plan & usage"
                        description="Live usage is calculated by the backend for this store."
                        icon={Package}
                        action={
                            <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-700">
                                {planAccess.planName || 'Starter'} ·{' '}
                                {money(planAccess.monthlyPrice)}/month
                            </div>
                        }
                    />

                    {usageWarnings.length > 0 && (
                        <div className="mt-5 grid gap-2">
                            {usageWarnings.map((warning) => (
                                <div
                                    key={`${warning.resource}-${warning.threshold}`}
                                    className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${
                                        warning.severity === 'critical'
                                            ? 'border-rose-200 bg-rose-50 text-rose-800'
                                            : 'border-amber-200 bg-amber-50 text-amber-800'
                                    }`}
                                >
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span className="leading-5">
                                        <strong>{warning.percentage}% used.</strong>{' '}
                                        {warning.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <UsageCard
                            label="Products"
                            used={usage.products}
                            limit={limits.productCount}
                            helper="catalogue capacity"
                            icon={Package}
                        />
                        <UsageCard
                            label="Staff"
                            used={usage.staff}
                            limit={limits.staffAccounts}
                            helper="team seats"
                            icon={Users}
                        />
                        <UsageCard
                            label="AI this week"
                            used={usage.ai?.used}
                            limit={usage.ai?.limit}
                            helper={
                                usage.ai?.resetsAt
                                    ? `Resets ${formatDate(usage.ai.resetsAt)}`
                                    : 'weekly quota'
                            }
                            icon={Sparkles}
                        />
                        <UsageCard
                            label="Images / product"
                            displayValue={`Up to ${limits.imagesPerProduct ?? 5}`}
                            helper="per product"
                            icon={ImageIcon}
                        />
                        <UsageCard
                            label="Activity logs"
                            displayValue={
                                planAccess.features?.activityLogs
                                    ? `${limits.activityLogRetentionDays || 7} days`
                                    : 'Not included'
                            }
                            helper="retention"
                            icon={History}
                        />
                    </div>
                </Panel>

                {sectionErrors.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">{sectionErrors.map(message => <p key={message}>{message}</p>)}<button type="button" onClick={load} className="mt-2 underline">Retry billing sections</button></div>}
                {subscription?.pendingBillingCycle && <p className="rounded-xl bg-indigo-50 p-4">Requested billing cycle: {subscription.pendingBillingCycle}. Your active cycle remains {subscription.billingCycle} until approval.</p>}
                <Panel id="plans" className="scroll-mt-6 p-5 sm:p-6">
                    <SectionHeading
                        eyebrow="Plans"
                        title="Choose the right plan"
                        description="Renew or change plans after payment verification. Remaining paid days are carried forward. Monthly purchases add 30 days; yearly purchases add 365 days. Downgrades take effect at the paid period end."
                        icon={Sparkles}
                        action={
                            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                                {['monthly', 'yearly'].map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setCycle(option)}
                                        aria-pressed={cycle === option}
                                        className={[
                                            'rounded-lg px-4 py-2 text-sm font-bold capitalize outline-none transition',
                                            'focus-visible:ring-2 focus-visible:ring-indigo-500',
                                            cycle === option
                                                ? 'bg-white text-slate-950 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900'
                                        ].join(' ')}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        }
                    />

                    <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.key || plan.name}
                                plan={plan}
                                cycle={cycle}
                                currentPlanIndex={currentPlanIndex}
                                subscription={subscription}
                                creatingPlan={creatingPlan}
                                onSelectPlan={handlePlanSelection}
                            />
                        ))}
                    </div>
                </Panel>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                    <Panel className="overflow-hidden">
                        <div className="p-5 sm:p-6">
                            <SectionHeading
                                eyebrow="Invoices"
                                title="Billing documents"
                                description="Review your invoices and jump directly to payment submission."
                                icon={ReceiptText}
                            />
                        </div>

                        <InvoiceList
                            invoices={invoices}
                            onPay={selectInvoiceForPayment}
                        />
                        <PaginationBar pagination={pages.invoices} label="invoices" onPrevious={() => setInvoicePage(value => value - 1)} onNext={() => setInvoicePage(value => value + 1)} />
                    </Panel>

                    <Panel id="payment" className="scroll-mt-6 p-5 sm:p-6">
                        <form onSubmit={submitPayment}>
                            <SectionHeading
                                eyebrow="Manual payment"
                                title="Submit payment"
                                description="Send your transaction details for Super Admin verification."
                                icon={CreditCard}
                            />

                            {selectedInvoice && (
                                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-500">
                                                Selected invoice
                                            </p>
                                            <p className="mt-1 font-black text-indigo-950">
                                                {selectedInvoice.invoiceNumber || 'Invoice'}
                                            </p>
                                            <p className="mt-1 text-xs font-medium text-indigo-700/80">
                                                {selectedInvoice.planName || 'Subscription'} ·{' '}
                                                {money(selectedInvoice.amount)}
                                            </p>
                                        </div>
                                        <StatusBadge value={selectedInvoice.status} />
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
                                <p className="font-bold">Where to pay</p>
                                <p className="mt-1 whitespace-pre-line">{current?.paymentInstructions?.[{ manual_bkash: 'bkash', manual_nagad: 'nagad', manual_bank: 'bank' }[paymentForm.provider]] || 'Payment destination has not been configured. Contact billing support before sending money.'}</p>
                                {current?.paymentInstructions?.support && <p className="mt-2">Support: {current.paymentInstructions.support}</p>}
                                <p className="mt-2">Use the invoice number as your reference. Send the exact invoice amount, then submit your transaction ID below.</p>
                            </div>
                            <PaginationBar pagination={pages.payable} label="payable invoices" onPrevious={() => setPayablePage(value => value - 1)} onNext={() => setPayablePage(value => value + 1)} />
                            <div className="mt-5 space-y-4">
                                <label className="block">
                                    <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                        Invoice
                                    </span>
                                    <select
                                        value={selectedInvoiceId}
                                        onChange={(event) => {
                                            const invoiceId = event.target.value;
                                            const invoice = paymentCandidates.find(
                                                (item) => getEntityId(item) === invoiceId
                                            );

                                            setSelectedInvoiceId(invoiceId);
                                            setSelectedInvoiceCache(invoice || null);
                                            setPaymentForm((previous) => ({
                                                ...previous,
                                                amount: String(invoice?.amount || '')
                                            }));
                                        }}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    >
                                        <option value="">Choose invoice</option>
                                        {paymentCandidates.map((invoice) => (
                                            <option
                                                key={getEntityId(invoice)}
                                                value={getEntityId(invoice)}
                                            >
                                                {invoice.invoiceNumber} ·{' '}
                                                {invoice.planName || 'Plan'} ·{' '}
                                                {money(invoice.amount)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                        Payment method
                                    </span>
                                    <select
                                        value={paymentForm.provider}
                                        onChange={(event) =>
                                            setPaymentForm((previous) => ({
                                                ...previous,
                                                provider: event.target.value
                                            }))
                                        }
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    >
                                        {Object.entries(providerLabels).map(
                                            ([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                        Transaction ID
                                    </span>
                                    <input
                                        required
                                        value={paymentForm.transactionId}
                                        onChange={(event) =>
                                            setPaymentForm((previous) => ({
                                                ...previous,
                                                transactionId: event.target.value
                                            }))
                                        }
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                        placeholder="Example: TXN123456789"
                                    />
                                </label>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                            Amount
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            inputMode="decimal"
                                            readOnly
                                            value={selectedInvoice?.amount ?? paymentForm.amount}
                                            onChange={(event) =>
                                                setPaymentForm((previous) => ({
                                                    ...previous,
                                                    amount: event.target.value
                                                }))
                                            }
                                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                            Sender number
                                        </span>
                                        <input
                                            inputMode="tel"
                                            autoComplete="tel"
                                            value={paymentForm.senderNumber}
                                            onChange={(event) =>
                                                setPaymentForm((previous) => ({
                                                    ...previous,
                                                    senderNumber: event.target.value
                                                }))
                                            }
                                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                            placeholder="Optional"
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                                        Proof URL
                                    </span>
                                    <input
                                        type="url"
                                        value={paymentForm.screenshotUrl}
                                        onChange={(event) =>
                                            setPaymentForm((previous) => ({
                                                ...previous,
                                                screenshotUrl: event.target.value
                                            }))
                                        }
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                        placeholder="Optional screenshot or proof link"
                                    />
                                </label>
                            </div>

                            <div className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                                <span>
                                    Submission does not activate the plan immediately.
                                    A Super Admin verifies the transaction first.
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !selectedInvoiceId}
                                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/15 outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Send className="h-4 w-4" aria-hidden="true" />
                                )}
                                {submitting
                                    ? 'Submitting…'
                                    : 'Submit for verification'}
                            </button>
                        </form>
                    </Panel>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <Panel className="overflow-hidden">
                        <div className="p-5 sm:p-6">
                            <SectionHeading
                                eyebrow="History"
                                title="Subscription timeline"
                                description="A chronological record of plan, trial, feature, and quota events."
                                icon={History}
                            />
                        </div>

                        <div className="border-t border-slate-100 px-5 pb-5 sm:px-6">
                            {timeline.length === 0 ? (
                                <p className="py-8 text-sm text-slate-500">
                                    No subscription events have been recorded yet.
                                </p>
                            ) : (
                                <div className="relative">
                                    <div className="absolute bottom-5 left-[7px] top-5 w-px bg-slate-200" />

                                    {timeline.map((item) => (
                                        <div
                                            key={item._id || `${item.eventType}-${item.occurredAt}`}
                                            className="relative flex gap-4 border-b border-slate-100 py-4 last:border-b-0"
                                        >
                                            <div className="relative z-[1] mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-[4px] border-white bg-indigo-500 shadow-[0_0_0_1px_rgb(226,232,240)]" />

                                            <div className="min-w-0 flex-1 sm:flex sm:items-start sm:justify-between sm:gap-4">
                                                <div>
                                                    <p className="font-bold capitalize text-slate-950">
                                                        {formatEventName(item.eventType)}
                                                    </p>
                                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                                        {item.reason ||
                                                            item.metadata?.resource ||
                                                            item.actor?.role ||
                                                            'System event'}
                                                    </p>
                                                </div>

                                                <time
                                                    className="mt-2 block shrink-0 text-xs font-semibold text-slate-400 sm:mt-0"
                                                    dateTime={item.occurredAt}
                                                >
                                                    {formatDate(item.occurredAt)}
                                                </time>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>

                    <div className="space-y-6">
                        <Panel className="p-5 sm:p-6">
                            <SectionHeading
                                eyebrow="Payments"
                                title="Payment history"
                                description="Your manual payment history, review results, and rejection reasons."
                                icon={ShieldCheck}
                            />

                            <div className="mt-5 space-y-2.5">
                                {payments.length === 0 ? (
                                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                                        No manual payments submitted yet.
                                    </div>
                                ) : (
                                    payments.map((payment) => (
                                        <div
                                            key={getEntityId(payment)}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-950">
                                                    {providerLabels[payment.provider] ||
                                                        payment.provider}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {[
                                                        payment.planName,
                                                        payment.transactionId ||
                                                        'No transaction ID'
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                            </div>
                                            <div><StatusBadge value={payment.status} /><p className="mt-1 text-xs">{money(payment.amount)} · Submitted {formatDate(payment.createdAt)}</p><p className="text-xs">Reviewed {formatDate(payment.verifiedAt)}</p>{payment.rejectionReason && <p className="mt-2 max-w-sm text-sm text-rose-700">Reason: {payment.rejectionReason}<br />If this transfer was correct, contact billing support before paying again.</p>}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <PaginationBar pagination={pages.payments} label="payments" onPrevious={() => setPaymentPage(value => value - 1)} onNext={() => setPaymentPage(value => value + 1)} />
                        </Panel>

                        <Panel className="p-5 sm:p-6">
                            <SectionHeading
                                eyebrow="Help"
                                title="Billing FAQ"
                                description="The essentials about trials, payment verification, and account safety."
                                icon={HelpCircle}
                            />

                            <div className="mt-5 divide-y divide-slate-100">
                                {[
                                    [
                                        'How does the free trial work?',
                                        'Every new vendor gets 14 days without payment.'
                                    ],
                                    [
                                        'How are payments verified?',
                                        'Submit your transaction ID and a Super Admin verifies the payment manually.'
                                    ],
                                    [
                                        'What do I save with yearly billing?',
                                        'Yearly pricing gives two months free compared with monthly billing.'
                                    ],
                                    [
                                        'What happens after the trial?',
                                        'You receive a grace period before operational restrictions apply.'
                                    ],
                                    [
                                        'Can Growth Center spend automatically?',
                                        'No. Growth Center helps plan ads but never spends money automatically.'
                                    ],
                                    [
                                        'Is my store data deleted if billing stops?',
                                        'No. Unpaid suspension does not delete products, orders, customers, or media.'
                                    ]
                                ].map(([question, answer]) => (
                                    <details
                                        key={question}
                                        className="group py-3 first:pt-0 last:pb-0"
                                    >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800 outline-none">
                                            <span>{question}</span>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
                                        </summary>
                                        <p className="mt-2 pr-7 text-sm leading-6 text-slate-500">
                                            {answer}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </Panel>
                    </div>
                </div>

                {downgradePreview && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="downgrade-title"
                        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
                        onMouseDown={(event) => {
                            if (
                                event.target === event.currentTarget &&
                                !downgradePending
                            ) {
                                setDowngradePreview(null);
                            }
                        }}
                    >
                        <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[26px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[26px]">
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
                                <div>
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-600">
                                        Plan change
                                    </p>
                                    <h2
                                        id="downgrade-title"
                                        className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950"
                                    >
                                        Downgrade to{' '}
                                        {downgradePreview.targetPlan.name}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setDowngradePreview(null)}
                                    disabled={downgradePending}
                                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                    aria-label="Close downgrade dialog"
                                >
                                    <X className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="p-5 sm:p-6">
                                <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                                    <p className="text-sm leading-6 text-amber-900">
                                        The downgrade takes effect at the end of the current
                                        paid period. Products and media are not deleted.
                                    </p>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <MetricCard
                                        label="Effective date"
                                        value={formatDate(
                                            downgradePreview.effectiveAt
                                        )}
                                        icon={CalendarClock}
                                        accent="amber"
                                    />
                                    <MetricCard
                                        label="Active products"
                                        value={`${retainedProductIds.length} / ${
                                            downgradePreview.productLimit ??
                                            'Unlimited'
                                        }`}
                                        icon={Package}
                                    />
                                </div>

                                {downgradePreview.requiresProductSelection && (
                                    <div className="mt-6">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <p className="font-black text-slate-950">
                                                    Choose products to keep active
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                                    Other products are archived reversibly
                                                    and can return after an eligible upgrade.
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-xs font-bold text-slate-400">
                                                {retainedProductIds.length} selected
                                            </span>
                                        </div>

                                        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 p-2">
                                            {(downgradePreview.availableProducts || []).map(
                                                (product) => {
                                                    const checked =
                                                        retainedProductIds.includes(
                                                            String(product.id)
                                                        );

                                                    return (
                                                        <label
                                                            key={product.id}
                                                            className={[
                                                                'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                                                                checked
                                                                    ? 'border-indigo-100 bg-indigo-50/70'
                                                                    : 'border-transparent hover:bg-slate-50'
                                                            ].join(' ')}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() =>
                                                                    toggleRetainedProduct(
                                                                        product.id
                                                                    )
                                                                }
                                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm font-bold text-slate-900">
                                                                    {product.title}
                                                                </span>
                                                                <span className="text-xs capitalize text-slate-500">
                                                                    {product.status}
                                                                </span>
                                                            </span>
                                                            {checked && (
                                                                <Check className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                                                            )}
                                                        </label>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
                                <button
                                    type="button"
                                    onClick={() => setDowngradePreview(null)}
                                    disabled={downgradePending}
                                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Keep current plan
                                </button>

                                <button
                                    type="button"
                                    onClick={scheduleDowngrade}
                                    disabled={downgradePending}
                                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {downgradePending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <Clock3 className="h-4 w-4" aria-hidden="true" />
                                    )}
                                    {downgradePending
                                        ? 'Scheduling…'
                                        : 'Confirm scheduled downgrade'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;
