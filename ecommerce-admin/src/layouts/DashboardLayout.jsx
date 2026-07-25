import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';
import VerificationBanner from '../components/dashboard/VerificationBanner';
import { CircleHelp, ShieldCheck, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../api/api';

const PlatformStepUpDialog = ({ open, onClose }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const previouslyFocused = document.activeElement;
        window.setTimeout(() => inputRef.current?.focus(), 0);
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !submitting) onClose();
            if (event.key !== 'Tab') return;
            const focusable = [...(dialogRef.current?.querySelectorAll(
                'button:not([disabled]), input:not([disabled])'
            ) || [])];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [onClose, open, submitting]);

    if (!open) return null;

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await API.post('/auth/step-up', { password });
            setPassword('');
            toast.success('Identity confirmed. Retry the sensitive action.');
            window.dispatchEvent(new CustomEvent('platform:recent-auth-complete'));
            onClose();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to confirm your identity.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
            <form
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="platform-step-up-title"
                aria-describedby="platform-step-up-description"
                onSubmit={submit}
                className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                    <div className="flex gap-3">
                        <span className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><ShieldCheck size={20} /></span>
                        <div>
                            <h2 id="platform-step-up-title" className="font-black text-slate-950">Confirm your identity</h2>
                            <p id="platform-step-up-description" className="mt-1 text-sm leading-5 text-slate-500">
                                Enter your password before performing this sensitive platform action.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} disabled={submitting} aria-label="Close identity confirmation" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">
                    <label htmlFor="platform-step-up-password" className="text-sm font-bold text-slate-900">Password</label>
                    <input
                        ref={inputRef}
                        id="platform-step-up-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                    <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700">Cancel</button>
                    <button type="submit" disabled={submitting || !password} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:bg-slate-300">
                        {submitting ? 'Confirming...' : 'Confirm identity'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const helpTextByPath = [
    {
        match: '/super-admin/audit-logs',
        title: 'Platform Audit Logs',
        body: 'Review Super Admin actions across shops, verification, announcements, domains, plans, and abuse reports.'
    },
    {
        match: '/super-admin/shops',
        title: 'Shop Governance',
        body: 'Review one shop in detail, including owner, verification, domain, abuse reports, feature flags, and suspension history.'
    },
    {
        match: '/super-admin/vendor-verifications',
        title: 'Vendor Verification',
        body: 'Review NID submissions carefully. Approve only clear documents and give vendors a specific reason when rejecting.'
    },
    {
        match: '/super-admin',
        title: 'Super Admin',
        body: 'Manage platform shops, governance, plans, domains, payments, announcements, and abuse reports.'
    },
    {
        match: '/dashboard/verification',
        title: 'Verification',
        body: 'Submit NID details for your store owner. Verification keeps the storefront active after the 20-day review deadline.'
    },
    {
        match: '/dashboard/products',
        title: 'Products',
        body: 'Add products with clear names, real photos, correct stock, and selling prices. Draft products stay hidden from customers.'
    },
    {
        match: '/dashboard/orders',
        title: 'Orders',
        body: 'Start from Pending orders. Confirm, process, ship, then deliver. Open View before changing status if you need customer or delivery details.'
    },
    {
        match: '/dashboard/returns',
        title: 'Returns',
        body: 'Record return requests and manual refund details here. This does not trigger payment gateway refunds.'
    },
    {
        match: '/dashboard/customers',
        title: 'Customers',
        body: 'This page shows shoppers for this store only. Use it to review customer history and contact customers when needed.'
    },
    {
        match: '/dashboard/notifications',
        title: 'Notifications',
        body: 'Important order, customer, return, and refund events appear here so staff can react quickly.'
    },
    {
        match: '/dashboard/promotions',
        title: 'Promotions',
        body: 'Create coupons for discounts or free shipping. Always set an expiry date so old offers do not stay active by mistake.'
    },
    {
        match: '/dashboard/growth',
        title: 'Growth Center',
        body: 'Use this page to find products worth promoting, products that need improvement, and what customers search for in your store.'
    },
    {
        match: '/dashboard/banners',
        title: 'Launch Banners',
        body: 'Create timed storefront banners and scheduled product launch countdowns. Scheduled-product banners unlock the product link only after publication.'
    },
    {
        match: '/dashboard/store-builder',
        title: 'Store Builder',
        body: 'Change colors, logo, homepage sections, checkout branding, policies, and navigation. Preview first, then save to publish.'
    },
    {
        match: '/dashboard/domain',
        title: 'Custom Domain',
        body: 'Connect your own domain, add the required DNS records, and verify ownership and storefront routing.'
    },
    {
        match: '/dashboard/shipping',
        title: 'Shipping',
        body: 'Connect courier settings before sending confirmed orders. Keep pickup address and phone number accurate.'
    },
    {
        match: '/dashboard/activity-logs',
        title: 'Activity Logs',
        body: 'Review tenant-scoped admin activity such as product changes, order status updates, returns, refunds, and staff permission edits.'
    },
    {
        match: '/dashboard',
        title: 'Dashboard',
        body: 'Use this page to check sales, orders, stock warnings, and store activity before deciding what to work on.'
    }
];

const getHelpText = (pathname) => (
    helpTextByPath.find(item => item.match === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.match)) || helpTextByPath[helpTextByPath.length - 1]
);

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const location = useLocation();
    const helpText = getHelpText(location.pathname);

    // UX Improvement: Auto-close the mobile sidebar whenever the route changes.
    // This prevents the user from having to manually close the menu after clicking a link.
    useEffect(() => {
        queueMicrotask(() => setIsSidebarOpen(false));
    }, [location.pathname]);

    useEffect(() => {
        const openStepUp = () => setStepUpOpen(true);
        window.addEventListener('platform:recent-auth-required', openStepUp);
        return () => window.removeEventListener('platform:recent-auth-required', openStepUp);
    }, []);

    return (

    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">

        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

            <Topbar onOpenMenu={() => setIsSidebarOpen(true)} />

            {/*
                  - scroll-smooth: Enables smooth scrolling for anchor links within pages.
                  - overflow-x-hidden: Prevents accidental horizontal scrolling on mobile.
                  - custom scrollbar classes (optional but recommended in your global css)
                */}
            <main inert={stepUpOpen ? true : undefined} className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth transition-all duration-300">
                {/*
                      Note: Because we added padding and max-w to the `Overview` component
                      in the previous step, we leave this container edge-to-edge.
                      This allows future pages (like full-screen maps or wide data tables)
                      to use the full width of the screen if they need to.
                    */}
                <div className="w-full h-full animate-in fade-in duration-500">
                    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
                        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            <div className="mt-0.5 rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
                                <CircleHelp size={16} />
                            </div>
                            <div>
                                <strong className="font-semibold text-slate-950">{helpText.title} guide</strong>
                                <p className="mt-0.5 leading-5">{helpText.body}</p>
                            </div>
                        </div>
                        <VerificationBanner />
                    </div>
                    <Outlet />
                </div>
            </main>
            <PlatformStepUpDialog open={stepUpOpen} onClose={() => setStepUpOpen(false)} />
        </div>
    </div>
);
};

export default DashboardLayout;
