import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, Clock, ShieldCheck } from 'lucide-react';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const statusCopy = {
    approved: {
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        icon: BadgeCheck,
        title: 'Store verified',
        body: 'Your NID verification is approved.'
    },
    pending: {
        tone: 'border-amber-200 bg-amber-50 text-amber-950',
        icon: Clock,
        title: 'Verification under review',
        body: 'Your NID documents are waiting for Super Admin review.'
    },
    rejected: {
        tone: 'border-rose-200 bg-rose-50 text-rose-950',
        icon: AlertTriangle,
        title: 'Verification needs changes',
        body: 'Review the rejection reason and submit corrected NID documents.'
    },
    suspended: {
        tone: 'border-rose-200 bg-rose-50 text-rose-950',
        icon: AlertTriangle,
        title: 'Store suspended until verification',
        body: 'Submit NID verification and wait for approval to reopen the storefront.'
    },
    default: {
        tone: 'border-indigo-200 bg-indigo-50 text-indigo-950',
        icon: ShieldCheck,
        title: 'NID verification required',
        body: 'Submit your NID within the verification deadline to keep the store active.'
    }
};

const getStatusConfig = (status) => {
    if (status?.isSuspended) return statusCopy.suspended;
    return statusCopy[status?.status] || statusCopy.default;
};

const VerificationBanner = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState(null);

    const loadStatus = useCallback(async () => {
        if (!['VendorAdmin', 'VendorStaff'].includes(user?.role)) return;
        try {
            const { data } = await API.get('/admin/vendor-verification/status');
            setStatus(data.data || null);
        } catch {
            setStatus(null);
        }
    }, [user?.role]);

    useEffect(() => {
        const timer = window.setTimeout(loadStatus, 0);
        return () => window.clearTimeout(timer);
    }, [loadStatus]);

    if (!status || user?.role === 'SuperAdmin') return null;

    const config = getStatusConfig(status);
    const Icon = config.icon;
    const deadline = status.deadline ? new Date(status.deadline).toLocaleDateString() : 'not set';

    return (
        <div className={`mt-3 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between ${config.tone}`}>
            <div className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                    <p className="font-bold">{config.title}</p>
                    <p className="mt-0.5 leading-5">
                        {config.body}
                        {status.status !== 'approved' && (
                            <span className="ml-1 font-semibold">
                                {status.daysLeft > 0 ? `${status.daysLeft} days left.` : `Deadline: ${deadline}.`}
                            </span>
                        )}
                    </p>
                </div>
            </div>
            <Link
                to="/dashboard/verification"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
            >
                {status.status === 'approved' ? 'View details' : 'Open verification'}
            </Link>
        </div>
    );
};

export default VerificationBanner;
