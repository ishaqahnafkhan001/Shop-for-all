import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import API from '../../api/api';

const BillingAlert = () => {
    const [billing, setBilling] = useState(null);

    useEffect(() => {
        let active = true;
        API.get('/admin/billing/current')
            .then(res => {
                if (active) setBilling(res.data.data || null);
            })
            .catch(() => {
                if (active) setBilling(null);
            });
        return () => {
            active = false;
        };
    }, []);

    const subscription = billing?.subscription;
    const latestInvoice = billing?.latestInvoice;
    if (!subscription) return null;

    const trialDaysLeft = Number(subscription.trialDaysLeft);
    const pendingPayment = latestInvoice?.status === 'submitted';
    const rejectedPayment = latestInvoice?.status === 'rejected';
    const overdue = ['past_due', 'grace'].includes(subscription.status);
    const suspended = subscription.status === 'suspended';
    const trialEndingSoon = subscription.status === 'trialing' && trialDaysLeft <= 3;

    if (!pendingPayment && !rejectedPayment && !overdue && !suspended && !trialEndingSoon) return null;

    const config = suspended
        ? {
            icon: AlertTriangle,
            title: 'Your store is restricted for billing.',
            message: 'Submit payment for Super Admin verification to reactivate billing.',
            className: 'border-rose-200 bg-rose-50 text-rose-950',
            iconClass: 'text-rose-600'
        }
        : rejectedPayment
            ? {
                icon: AlertTriangle,
                title: 'Your payment was rejected.',
                message: latestInvoice?.notes || 'Please submit a corrected payment for verification.',
                className: 'border-rose-200 bg-rose-50 text-rose-950',
                iconClass: 'text-rose-600'
            }
            : pendingPayment
                ? {
                    icon: Clock,
                    title: 'Your payment is pending verification.',
                    message: 'A Super Admin will verify it soon.',
                    className: 'border-indigo-200 bg-indigo-50 text-indigo-950',
                    iconClass: 'text-indigo-600'
                }
                : overdue
                    ? {
                        icon: AlertTriangle,
                        title: 'Your billing needs attention.',
                        message: 'Pay your invoice before restrictions apply.',
                        className: 'border-amber-200 bg-amber-50 text-amber-950',
                        iconClass: 'text-amber-600'
                    }
                    : {
                        icon: CalendarClock,
                        title: `Your free trial ends in ${Math.max(trialDaysLeft, 0)} days.`,
                        message: 'Choose a plan when you are ready to keep your store live.',
                        className: 'border-sky-200 bg-sky-50 text-sky-950',
                        iconClass: 'text-sky-600'
                    };

    const Icon = config.icon || CheckCircle2;

    return (
        <div className={`rounded-2xl border p-4 ${config.className}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                    <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconClass}`} />
                    <div>
                        <p className="font-black">{config.title}</p>
                        <p className="mt-1 text-sm opacity-80">{config.message}</p>
                    </div>
                </div>
                <Link
                    to="/dashboard/billing"
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-slate-800"
                >
                    Open Billing
                </Link>
            </div>
        </div>
    );
};

export default BillingAlert;
