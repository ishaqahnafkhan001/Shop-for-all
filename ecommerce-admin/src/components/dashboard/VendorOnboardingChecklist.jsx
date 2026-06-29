import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BadgeCheck,
    BarChart3,
    CheckCircle2,
    FileText,
    Image,
    PackagePlus,
    Palette,
    Settings,
    ShieldCheck,
    TicketPercent,
    Truck
} from 'lucide-react';
import API from '../../api/api';
import { AdminLoadingState } from '../ui/AdminState.jsx';

const checklist = [
    {
        key: 'profileComplete',
        title: 'Complete store profile',
        description: 'Confirm your store name, subdomain, and owner details.',
        cta: 'Review settings',
        path: '/dashboard/settings',
        icon: Settings
    },
    {
        key: 'logoUploaded',
        title: 'Upload logo',
        description: 'Add a logo so shoppers recognize your brand.',
        cta: 'Customize brand',
        path: '/dashboard/store-builder',
        icon: Image
    },
    {
        key: 'nidSubmitted',
        title: 'Submit NID verification',
        description: 'Keep your storefront active by completing verification.',
        cta: 'Open verification',
        path: '/dashboard/verification',
        icon: ShieldCheck
    },
    {
        key: 'firstProductAdded',
        title: 'Add first product',
        description: 'Create a product with title, price, stock, and description.',
        cta: 'Add product',
        path: '/dashboard/products/add',
        icon: PackagePlus
    },
    {
        key: 'productImagesAdded',
        title: 'Add product images',
        description: 'Upload clear images so customers know what they are buying.',
        cta: 'Add images',
        path: '/dashboard/products',
        icon: Image
    },
    {
        key: 'shippingConfigured',
        title: 'Configure shipping',
        description: 'Connect courier pickup details before orders start coming in.',
        cta: 'Set shipping',
        path: '/dashboard/shipping',
        icon: Truck
    },
    {
        key: 'refundPolicyAdded',
        title: 'Add return/refund policy',
        description: 'Tell shoppers how returns and refunds work.',
        cta: 'Add policy',
        path: '/dashboard/store-builder',
        icon: FileText
    },
    {
        key: 'storefrontCustomized',
        title: 'Customize storefront theme',
        description: 'Adjust logo, colors, hero, sections, and footer.',
        cta: 'Customize store',
        path: '/dashboard/store-builder',
        icon: Palette
    },
    {
        key: 'storefrontPublished',
        title: 'Publish storefront',
        description: 'Save Store Builder changes so customers see the live version.',
        cta: 'Publish changes',
        path: '/dashboard/store-builder',
        icon: BadgeCheck
    },
    {
        key: 'firstCouponCreated',
        title: 'Create first coupon',
        description: 'Use a small offer to encourage your first sales.',
        cta: 'Create coupon',
        path: '/dashboard/promotions',
        icon: TicketPercent
    },
    {
        key: 'growthTrafficStarted',
        title: 'Check Growth Center after traffic starts',
        description: 'Use traffic data to decide what to advertise or improve.',
        cta: 'Open Growth Center',
        path: '/dashboard/growth',
        icon: BarChart3
    }
];

const getVerificationNote = (verification) => {
    if (!verification?.status || verification.status === 'not_submitted') return '';
    if (verification.status === 'rejected') return 'Rejected. Please resubmit corrected documents.';
    if (verification.status === 'approved') return 'Approved.';
    if (verification.status === 'pending') return 'Submitted and waiting for review.';
    return 'Needs attention.';
};

const VendorOnboardingChecklist = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const response = await API.get('/admin/onboarding');
                if (mounted) setData(response.data.data || null);
            } catch {
                if (mounted) setData(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const items = useMemo(() => checklist.map(item => ({
        ...item,
        completed: Boolean(data?.signals?.[item.key])
    })), [data]);

    const completedCount = items.filter(item => item.completed).length;
    const progress = Math.round((completedCount / items.length) * 100);
    const nextItem = items.find(item => !item.completed);
    const verificationNote = getVerificationNote(data?.verification);

    if (loading) {
        return (
            <AdminLoadingState
                title="Preparing setup checklist"
                description="Checking your store, products, shipping, policies, and Growth Center activity."
            />
        );
    }

    if (progress >= 100) return null;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Seller setup</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Launch checklist</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        Finish these steps to make your store easier to trust, shop, and promote.
                    </p>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-900">
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Progress</p>
                    <p className="mt-1 text-2xl font-black">{progress}%</p>
                    <p className="text-xs font-semibold">{completedCount} of {items.length} complete</p>
                </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>

            {nextItem && (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-black">Do next: {nextItem.title}</p>
                        <p className="mt-1 text-sm leading-5 text-amber-800">{nextItem.description}</p>
                    </div>
                    <Link to={nextItem.path} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-black text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100">
                        {nextItem.cta}
                    </Link>
                </div>
            )}

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map(item => {
                    const Icon = item.icon;
                    return (
                        <div key={item.key} className={`rounded-xl border p-4 transition ${item.completed ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`rounded-xl p-2 ${item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {item.completed ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-black text-slate-950">{item.title}</p>
                                    <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                                    {item.key === 'nidSubmitted' && verificationNote && (
                                        <p className="mt-1 text-xs font-bold text-slate-500">{verificationNote}</p>
                                    )}
                                    {!item.completed && (
                                        <Link to={item.path} className="mt-3 inline-flex text-sm font-black text-indigo-700 hover:text-indigo-900">
                                            {item.cta}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default VendorOnboardingChecklist;
