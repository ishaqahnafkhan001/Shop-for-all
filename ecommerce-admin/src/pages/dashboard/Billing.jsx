import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    BadgeCheck,
    CalendarClock,
    Check,
    CreditCard,
    FileText,
    HelpCircle,
    Loader2,
    Send,
    ShieldCheck
} from 'lucide-react';
import API from '../../api/api';
import { AdminErrorState, AdminLoadingState } from '../../components/ui/AdminState.jsx';

const plans = [
    {
        name: 'Starter',
        monthly: 999,
        yearly: 9990,
        productLimit: 100,
        staffLimit: 1,
        recommended: false,
        features: ['100 products', '1 staff account', 'Coupons', 'Store Builder', 'Basic analytics']
    },
    {
        name: 'Growth',
        monthly: 2499,
        yearly: 24990,
        productLimit: 500,
        staffLimit: 3,
        recommended: true,
        features: ['500 products', '3 staff accounts', 'Growth Center', 'AI ad helper', 'Custom domain', 'Trusted Badge eligibility']
    },
    {
        name: 'Pro',
        monthly: 5999,
        yearly: 59990,
        productLimit: 2000,
        staffLimit: 10,
        recommended: false,
        features: ['2,000 products', '10 staff accounts', 'Priority support', 'Growth Center', 'AI ad helper', 'Trusted Badge eligibility']
    }
];

const providerLabels = {
    manual_bkash: 'bKash',
    manual_nagad: 'Nagad',
    manual_bank: 'Bank transfer',
    other: 'Other'
};

const money = (value) => `৳${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const statusClass = (status) => ({
    trialing: 'bg-sky-50 text-sky-700 ring-sky-100',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    grace: 'bg-amber-50 text-amber-700 ring-amber-100',
    past_due: 'bg-amber-50 text-amber-700 ring-amber-100',
    suspended: 'bg-rose-50 text-rose-700 ring-rose-100',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
    unpaid: 'bg-slate-100 text-slate-600 ring-slate-200',
    submitted: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    verified: 'bg-emerald-50 text-emerald-700 ring-emerald-100'
}[status] || 'bg-slate-100 text-slate-600 ring-slate-200');

const StatusBadge = ({ value }) => (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${statusClass(value)}`}>
        {String(value || '-').replace(/_/g, ' ')}
    </span>
);

const BillingBanner = ({ subscription, latestInvoice }) => {
    if (!subscription) return null;

    if (subscription.status === 'trialing') {
        return (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                        <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-600" />
                        <div>
                            <p className="font-black">Your free trial ends in {Math.max(subscription.trialDaysLeft || 0, 0)} days.</p>
                            <p className="mt-1 text-sm text-sky-800">You can build your store and test checkout before choosing a plan.</p>
                        </div>
                    </div>
                    <a href="#plans" className="rounded-xl bg-sky-700 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-800">
                        Choose a plan
                    </a>
                </div>
            </div>
        );
    }

    if (['past_due', 'grace', 'suspended'].includes(subscription.status)) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <div>
                            <p className="font-black">
                                {subscription.status === 'suspended' ? 'Your store is restricted for billing.' : 'Your billing needs attention.'}
                            </p>
                            <p className="mt-1 text-sm text-amber-800">
                                Submit your manual payment for Super Admin verification. Your data is safe and will not be deleted.
                            </p>
                        </div>
                    </div>
                    {latestInvoice && (
                        <a href="#payment" className="rounded-xl bg-amber-700 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-amber-800">
                            Pay invoice
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

const Billing = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [current, setCurrent] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [cycle, setCycle] = useState('monthly');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [creatingPlan, setCreatingPlan] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        provider: 'manual_bkash',
        transactionId: '',
        senderNumber: '',
        amount: '',
        screenshotUrl: ''
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [currentRes, invoiceRes, paymentRes] = await Promise.all([
                API.get('/admin/billing/current'),
                API.get('/admin/billing/invoices', { params: { limit: 20 } }),
                API.get('/admin/billing/payments', { params: { limit: 20 } })
            ]);

            const currentData = currentRes.data.data || {};
            const invoiceRows = invoiceRes.data.data || [];
            setCurrent(currentData);
            setInvoices(invoiceRows);
            setPayments(paymentRes.data.data || []);

            const payable = invoiceRows.find(invoice => ['unpaid', 'rejected', 'submitted'].includes(invoice.status));
            if (payable) {
                setSelectedInvoiceId(payable.id || payable._id);
                setPaymentForm(prev => ({ ...prev, amount: String(payable.amount || '') }));
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load billing.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const latestInvoice = current?.latestInvoice;
    const subscription = current?.subscription;
    const selectedInvoice = useMemo(() => {
        return invoices.find(invoice => String(invoice.id || invoice._id) === String(selectedInvoiceId));
    }, [invoices, selectedInvoiceId]);

    const createInvoice = async (planName) => {
        setCreatingPlan(planName);
        try {
            const res = await API.post('/admin/billing/invoices', { planName, billingCycle: cycle });
            toast.success(`${planName} invoice created`);
            const invoice = res.data.data;
            await load();
            setSelectedInvoiceId(invoice?.id || invoice?._id || '');
            setPaymentForm(prev => ({ ...prev, amount: String(invoice?.amount || '') }));
            document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create invoice');
        } finally {
            setCreatingPlan('');
        }
    };

    const submitPayment = async (event) => {
        event.preventDefault();
        if (!selectedInvoiceId) {
            toast.error('Choose an invoice first');
            return;
        }
        if (!paymentForm.transactionId.trim()) {
            toast.error('Transaction ID is required');
            return;
        }
        setSubmitting(true);
        try {
            await API.post(`/admin/billing/invoices/${selectedInvoiceId}/submit-payment`, {
                ...paymentForm,
                amount: Number(paymentForm.amount || selectedInvoice?.amount || 0)
            });
            toast.success('Payment submitted for Super Admin verification');
            setPaymentForm({
                provider: 'manual_bkash',
                transactionId: '',
                senderNumber: '',
                amount: '',
                screenshotUrl: ''
            });
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <AdminLoadingState title="Loading billing" description="We are checking your trial, invoices, and manual payment status." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <AdminErrorState
                    title="Billing could not load"
                    description={error}
                    action={(
                        <button onClick={load} className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800">
                            Try again
                        </button>
                    )}
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Billing</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Manage your SaaS plan</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Start with a 14-day free trial, choose a plan, then submit your bKash, Nagad, or bank payment for Super Admin verification.
                    </p>
                </div>
            </div>

            <BillingBanner subscription={subscription} latestInvoice={latestInvoice} />

            <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Current subscription</h2>
                            <p className="mt-1 text-sm text-slate-500">Your current billing state and renewal dates.</p>
                        </div>
                        <StatusBadge value={subscription?.status} />
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Plan</p>
                            <p className="mt-1 font-black text-slate-950">{current?.plan?.name || 'Starter'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Billing cycle</p>
                            <p className="mt-1 font-black capitalize text-slate-950">{subscription?.billingCycle || 'monthly'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Trial ends</p>
                            <p className="mt-1 font-black text-slate-950">{formatDate(subscription?.trialEndsAt)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Period ends</p>
                            <p className="mt-1 font-black text-slate-950">{formatDate(subscription?.currentPeriodEnd || subscription?.graceEndsAt)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black text-slate-950">Plan features</h2>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                        {(current?.plan?.features ? Object.entries(current.plan.features) : []).slice(0, 8).map(([key, enabled]) => (
                            <div key={key} className="flex items-center justify-between gap-2">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <span className={enabled ? 'text-emerald-600' : 'text-slate-300'}>
                                    {enabled ? 'Included' : 'Not included'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="plans" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">Choose a plan</h2>
                        <p className="mt-1 text-sm text-slate-500">Yearly billing gives you two months free.</p>
                    </div>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                        {['monthly', 'yearly'].map(option => (
                            <button
                                key={option}
                                onClick={() => setCycle(option)}
                                className={`rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${cycle === option ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {plans.map(plan => (
                        <div
                            key={plan.name}
                            className={`relative rounded-2xl border p-5 ${plan.recommended ? 'border-indigo-300 bg-indigo-50/50 shadow-md' : 'border-slate-200 bg-white'}`}
                        >
                            {plan.recommended && (
                                <span className="absolute right-4 top-4 rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">
                                    Recommended
                                </span>
                            )}
                            <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
                            <p className="mt-2 text-3xl font-black text-slate-950">
                                {money(cycle === 'yearly' ? plan.yearly : plan.monthly)}
                                <span className="text-sm font-bold text-slate-500">/{cycle === 'yearly' ? 'year' : 'month'}</span>
                            </p>
                            {plan.name !== 'Starter' && (
                                <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                                    <BadgeCheck className="h-4 w-4" />
                                    Eligible to apply for Trusted Badge after requirements are met.
                                </p>
                            )}
                            <div className="mt-4 space-y-2">
                                {plan.features.map(feature => (
                                    <div key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                                        <Check className="h-4 w-4 text-emerald-600" />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => createInvoice(plan.name)}
                                disabled={creatingPlan === plan.name}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {creatingPlan === plan.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Create invoice
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5">
                        <h2 className="text-lg font-black text-slate-950">Invoices</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Invoice</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Due</th>
                                    <th className="px-5 py-3">Paid</th>
                                    <th className="px-5 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.length === 0 ? (
                                    <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No invoices yet. Choose a plan to create one.</td></tr>
                                ) : invoices.map(invoice => (
                                    <tr key={invoice.id}>
                                        <td className="px-5 py-4 font-bold text-slate-950">{invoice.invoiceNumber}</td>
                                        <td className="px-5 py-4">{money(invoice.amount)}</td>
                                        <td className="px-5 py-4"><StatusBadge value={invoice.status} /></td>
                                        <td className="px-5 py-4">{formatDate(invoice.dueDate)}</td>
                                        <td className="px-5 py-4">{formatDate(invoice.paidAt)}</td>
                                        <td className="px-5 py-4">
                                            {invoice.status !== 'paid' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedInvoiceId(invoice.id);
                                                        setPaymentForm(prev => ({ ...prev, amount: String(invoice.amount || '') }));
                                                        document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth' });
                                                    }}
                                                    className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                                                >
                                                    Submit payment
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <form id="payment" onSubmit={submitPayment} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-black text-slate-950">Submit manual payment</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Submit your bKash/Nagad transaction ID. A Super Admin will verify it before your subscription becomes active.
                    </p>
                    <div className="mt-5 space-y-4">
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700">Invoice</span>
                            <select
                                value={selectedInvoiceId}
                                onChange={event => {
                                    const invoiceId = event.target.value;
                                    setSelectedInvoiceId(invoiceId);
                                    const invoice = invoices.find(item => String(item.id) === invoiceId);
                                    setPaymentForm(prev => ({ ...prev, amount: String(invoice?.amount || '') }));
                                }}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            >
                                <option value="">Choose invoice</option>
                                {invoices.filter(invoice => invoice.status !== 'paid').map(invoice => (
                                    <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {money(invoice.amount)}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700">Payment method</span>
                            <select
                                value={paymentForm.provider}
                                onChange={event => setPaymentForm(prev => ({ ...prev, provider: event.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            >
                                {Object.entries(providerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700">Transaction ID</span>
                            <input
                                value={paymentForm.transactionId}
                                onChange={event => setPaymentForm(prev => ({ ...prev, transactionId: event.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="Example: TXN123456789"
                            />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-bold text-slate-700">Amount</span>
                                <input
                                    type="number"
                                    value={paymentForm.amount}
                                    onChange={event => setPaymentForm(prev => ({ ...prev, amount: event.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-slate-700">Sender number</span>
                                <input
                                    value={paymentForm.senderNumber}
                                    onChange={event => setPaymentForm(prev => ({ ...prev, senderNumber: event.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    placeholder="Optional"
                                />
                            </label>
                        </div>
                        <label className="block">
                            <span className="text-sm font-bold text-slate-700">Proof URL</span>
                            <input
                                value={paymentForm.screenshotUrl}
                                onChange={event => setPaymentForm(prev => ({ ...prev, screenshotUrl: event.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="Optional screenshot/proof link"
                            />
                        </label>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit for verification
                    </button>
                </form>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        Payment status
                    </h2>
                    <div className="mt-4 space-y-3">
                        {payments.length === 0 ? (
                            <p className="text-sm text-slate-500">No manual payments submitted yet.</p>
                        ) : payments.slice(0, 5).map(payment => (
                            <div key={payment.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                <div>
                                    <p className="font-bold text-slate-950">{providerLabels[payment.provider] || payment.provider}</p>
                                    <p className="text-xs text-slate-500">{payment.transactionId || 'No transaction ID'}</p>
                                </div>
                                <StatusBadge value={payment.status} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                        <HelpCircle className="h-5 w-5 text-indigo-600" />
                        Billing FAQ
                    </h2>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                        <p><strong>Free trial:</strong> Every new vendor gets 14 days without payment.</p>
                        <p><strong>Manual verification:</strong> Submit your transaction ID and Super Admin verifies payment manually.</p>
                        <p><strong>Yearly discount:</strong> Yearly pricing gives two months free compared with monthly billing.</p>
                        <p><strong>After trial:</strong> You get a grace period before operational restrictions apply.</p>
                        <p><strong>No automatic ad spending:</strong> Growth Center helps plan ads but never spends money automatically.</p>
                        <p><strong>Your data:</strong> Unpaid suspension does not delete products, orders, or customer data.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Billing;
