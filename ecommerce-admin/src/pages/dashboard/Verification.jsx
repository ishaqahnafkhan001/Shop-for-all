import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, BadgeCheck, Clock, FileImage, ShieldCheck, UploadCloud } from 'lucide-react';
import API from '../../api/api';

const emptyForm = {
    nidName: '',
    nidNumber: '',
    nidFront: null,
    nidBack: null
};

const stateContent = {
    approved: {
        icon: BadgeCheck,
        title: 'Store verified',
        body: 'Your NID verification is approved. No further action is required.',
        tone: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    pending: {
        icon: Clock,
        title: 'Pending review',
        body: 'Your submitted NID is waiting for Super Admin review.',
        tone: 'bg-amber-50 text-amber-900 border-amber-200'
    },
    rejected: {
        icon: AlertTriangle,
        title: 'Verification rejected',
        body: 'Please correct the issue and submit your NID again.',
        tone: 'bg-rose-50 text-rose-900 border-rose-200'
    },
    suspended: {
        icon: AlertTriangle,
        title: 'Store suspended',
        body: 'Your verification deadline has expired. Submit NID verification and wait for approval to reopen the storefront.',
        tone: 'bg-rose-50 text-rose-900 border-rose-200'
    },
    default: {
        icon: ShieldCheck,
        title: 'NID verification required',
        body: 'Submit NID details before the deadline to keep your storefront active.',
        tone: 'bg-indigo-50 text-indigo-900 border-indigo-200'
    }
};

const getStateContent = (status) => {
    if (status?.isSuspended) return stateContent.suspended;
    return stateContent[status?.status] || stateContent.default;
};

const Field = ({ label, helper, children }) => (
    <label className="block">
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        {helper && <span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span>}
        <div className="mt-2">{children}</div>
    </label>
);

const DocumentPreview = ({ label, url }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img src={url} alt={label} className="h-40 w-full object-cover" />
            </a>
        ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
                <FileImage className="h-8 w-8" />
            </div>
        )}
    </div>
);

const Verification = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const loadStatus = useCallback(async () => {
        try {
            const { data } = await API.get('/admin/vendor-verification/status');
            setStatus(data.data || null);
        } catch {
            toast.error('Failed to load verification status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(loadStatus, 0);
        return () => window.clearTimeout(timer);
    }, [loadStatus]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (status?.status === 'approved') return;

        const payload = new FormData();
        payload.append('nidName', form.nidName);
        payload.append('nidNumber', form.nidNumber);
        if (form.nidFront) payload.append('nidFront', form.nidFront);
        if (form.nidBack) payload.append('nidBack', form.nidBack);

        setSubmitting(true);
        try {
            const { data } = await API.post('/admin/vendor-verification/submit', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(data.message || 'Verification submitted');
            setForm(emptyForm);
            await loadStatus();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit verification');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading verification...</div>
            </div>
        );
    }

    const content = getStateContent(status);
    const Icon = content.icon;
    const canSubmit = status?.canSubmit !== false;
    const deadline = status?.deadline ? new Date(status.deadline).toLocaleString() : 'Not set';

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-black text-slate-950">Vendor Verification</h1>
                <p className="mt-1 text-sm text-slate-500">Verify the store owner with NID documents. Documents are visible only to you and Super Admin reviewers.</p>
            </div>

            <section className={`rounded-2xl border p-5 shadow-sm ${content.tone}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                        <Icon className="mt-1 h-6 w-6 shrink-0" />
                        <div>
                            <h2 className="text-lg font-black">{content.title}</h2>
                            <p className="mt-1 text-sm leading-6">{content.body}</p>
                            {status?.rejectionReason && (
                                <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold">
                                    Reason: {status.rejectionReason}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-xl bg-white/75 px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
                        <p className="font-bold">Deadline</p>
                        <p className="mt-1">{deadline}</p>
                        {status?.status !== 'approved' && <p className="mt-1 text-xs">{status?.daysLeft || 0} days left</p>}
                    </div>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
                <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
                            <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-950">Submit NID documents</h2>
                            <p className="text-sm text-slate-500">Use clear front and back images. Blurry documents may be rejected.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Name on NID" helper="Enter the name exactly as shown on the NID.">
                            <input
                                required
                                disabled={!canSubmit}
                                value={form.nidName}
                                onChange={event => setForm(prev => ({ ...prev, nidName: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                            />
                        </Field>
                        <Field label="NID number" helper="Only the vendor and Super Admin can view this.">
                            <input
                                required
                                disabled={!canSubmit}
                                value={form.nidNumber}
                                onChange={event => setForm(prev => ({ ...prev, nidNumber: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                            />
                        </Field>
                        <Field label="NID front image">
                            <input
                                required
                                disabled={!canSubmit}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={event => setForm(prev => ({ ...prev, nidFront: event.target.files?.[0] || null }))}
                                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm disabled:bg-slate-100"
                            />
                        </Field>
                        <Field label="NID back image">
                            <input
                                required
                                disabled={!canSubmit}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={event => setForm(prev => ({ ...prev, nidBack: event.target.files?.[0] || null }))}
                                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm disabled:bg-slate-100"
                            />
                        </Field>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            type="submit"
                            disabled={!canSubmit || submitting}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {submitting ? 'Submitting...' : 'Submit for review'}
                        </button>
                        {!canSubmit && <p className="text-sm text-slate-500">Approved stores cannot resubmit verification.</p>}
                    </div>
                </form>

                <aside className="space-y-4">
                    <DocumentPreview label="Submitted NID front" url={status?.documents?.nidFrontUrl} />
                    <DocumentPreview label="Submitted NID back" url={status?.documents?.nidBackUrl} />
                </aside>
            </div>
        </div>
    );
};

export default Verification;
