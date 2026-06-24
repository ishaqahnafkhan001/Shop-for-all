import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Settings,
    X,
    Truck,
    Palette,
    TicketPercent,
    BarChart3,
    TrendingUp,
    Shield,
    Crown,
    Boxes,
    RefreshCcw,
    Bell,
    History,
    BadgeCheck,
    FileText,
    LockKeyhole,
    CreditCard
} from 'lucide-react';
import { FEATURE_LABELS, hasFeature } from '../../utils/featureAccess';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const location = useLocation();
    const isSuperAdmin = user?.role === 'SuperAdmin';

    const vendorNavItems = [
        { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Products', path: '/dashboard/products', icon: Package },
        { name: 'Catalog Tools', path: '/dashboard/catalog-tools', icon: Boxes, feature: 'bulkProductTools' },
        { name: 'Orders', path: '/dashboard/orders', icon: ShoppingCart },
        { name: 'Returns', path: '/dashboard/returns', icon: RefreshCcw },
        { name: 'Customers', path: '/dashboard/customers', icon: Users },
        { name: 'Privacy Requests', path: '/dashboard/privacy-requests', icon: FileText },
        { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
        { name: 'Verification', path: '/dashboard/verification', icon: BadgeCheck },
        { name: 'Billing', path: '/dashboard/billing', icon: CreditCard },
        { name: 'Promotions', path: '/dashboard/promotions', icon: TicketPercent, feature: 'coupons' },
        { name: 'Growth Center', path: '/dashboard/growth', icon: TrendingUp, feature: 'growthCenter' },
        { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3, feature: 'analytics' },
        { name: 'Store Builder', path: '/dashboard/store-builder', icon: Palette, adminOnly: true, feature: 'storeBuilder' },
        { name: 'Staff', path: '/dashboard/staff', icon: Shield, adminOnly: true, feature: 'staffAccounts' },
        { name: 'Activity Logs', path: '/dashboard/activity-logs', icon: History, adminOnly: true },

        // 🚚 NEW: Added the Shipping link here
        { name: 'Shipping', path: '/dashboard/shipping', icon: Truck },

        { name: 'Settings', path: '/dashboard/settings', icon: Settings },
    ];

    const superAdminNavItems = [
        { name: 'Super Admin', path: '/super-admin', icon: Crown },
        { name: 'Billing', path: '/super-admin/billing', icon: CreditCard },
        { name: 'Vendor Verification', path: '/super-admin/vendor-verifications', icon: BadgeCheck },
        { name: 'Platform Audit Logs', path: '/super-admin/audit-logs', icon: History }
    ];

    const navItems = isSuperAdmin
        ? superAdminNavItems
        : vendorNavItems.filter(item => !item.adminOnly || user?.role === 'VendorAdmin');
    const activeItem = navItems
        .filter(item => item.path === '/dashboard' ? location.pathname === item.path : location.pathname.startsWith(item.path))
        .sort((a, b) => b.path.length - a.path.length)[0] || navItems[0];
    const ActiveIcon = activeItem?.icon;
    const activeItemLocked = activeItem ? !hasFeature(user, activeItem.feature) : false;

    return (
        <>
            {/* Mobile Dark Overlay Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* The Sidebar itself */}
            <div className={`
                fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white
                transform transition-transform duration-300 ease-in-out
                md:static md:translate-x-0 
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
                    <span className="text-2xl font-black tracking-tight text-slate-950">
                        {isSuperAdmin ? 'Platform.' : 'ScaleUp.'}
                    </span>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg p-2 -mr-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 md:hidden"
                        aria-label="Close navigation"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                    <nav className="space-y-1.5 px-4">
                        <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                            Current page
                        </p>
                        {activeItem && activeItemLocked ? (
                            <div
                                title={`${FEATURE_LABELS[activeItem.feature] || activeItem.name} is not available on your current plan.`}
                                className="group flex cursor-not-allowed items-center rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-400 ring-1 ring-slate-100"
                            >
                                <ActiveIcon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-300" />
                                <span className="min-w-0 flex-1 truncate">{activeItem.name}</span>
                                <LockKeyhole className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                            </div>
                        ) : activeItem && (
                            <NavLink
                                to={activeItem.path}
                                end={activeItem.path === '/dashboard'}
                                onClick={() => setIsOpen(false)}
                                className="group flex items-center rounded-lg bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                            >
                                <ActiveIcon className="flex-shrink-0 mr-3 h-5 w-5 text-indigo-600" />
                                <span>{activeItem.name}</span>
                            </NavLink>
                        )}
        <div className="pt-4">
            <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Navigation
            </p>
            <div className="mt-2 space-y-1.5">
                {navItems
                    .filter(item => item.path !== activeItem?.path)
                    .map((item) => {
                        const Icon = item.icon;
                        const locked = !hasFeature(user, item.feature);

                        if (locked) {
                            return (
                                <div
                                    key={item.name}
                                    title={`${FEATURE_LABELS[item.feature] || item.name} is not available on your current plan.`}
                                    className="group flex cursor-not-allowed items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-400"
                                >
                                    <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-300" />
                                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                    <LockKeyhole className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                end={item.path === '/dashboard'}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => `
                                    group flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition
                                    ${isActive
                                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}
                                `}
                            >
                                <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 transition group-hover:text-slate-600" />
                                <span>{item.name}</span>
                            </NavLink>
                        );
                    })}
            </div>
        </div>
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
