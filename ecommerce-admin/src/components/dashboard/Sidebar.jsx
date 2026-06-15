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
    Boxes
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const location = useLocation();
    const isSuperAdmin = user?.role === 'SuperAdmin';

    const vendorNavItems = [
        { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Products', path: '/dashboard/products', icon: Package },
        { name: 'Catalog Tools', path: '/dashboard/catalog-tools', icon: Boxes },
        { name: 'Orders', path: '/dashboard/orders', icon: ShoppingCart },
        { name: 'Customers', path: '/dashboard/customers', icon: Users },
        { name: 'Promotions', path: '/dashboard/promotions', icon: TicketPercent },
        { name: 'Growth Center', path: '/dashboard/growth', icon: TrendingUp },
        { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
        { name: 'Store Builder', path: '/dashboard/store-builder', icon: Palette, adminOnly: true },
        { name: 'Staff', path: '/dashboard/staff', icon: Shield, adminOnly: true },

        // 🚚 NEW: Added the Shipping link here
        { name: 'Shipping', path: '/dashboard/shipping', icon: Truck },

        { name: 'Settings', path: '/dashboard/settings', icon: Settings },
    ];

    const superAdminNavItems = [
        { name: 'Super Admin', path: '/super-admin', icon: Crown }
    ];

    const navItems = isSuperAdmin
        ? superAdminNavItems
        : vendorNavItems.filter(item => !item.adminOnly || user?.role === 'VendorAdmin');
    const activeItem = navItems
        .filter(item => item.path === '/dashboard' ? location.pathname === item.path : location.pathname.startsWith(item.path))
        .sort((a, b) => b.path.length - a.path.length)[0] || navItems[0];
    const ActiveIcon = activeItem?.icon;

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
                        {activeItem && (
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
