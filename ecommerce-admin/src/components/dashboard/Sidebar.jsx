import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Settings,
    X,
    Megaphone,
    Truck,
    Palette,
    TicketPercent,
    BarChart3,
    Shield,
    Crown,
    Boxes
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SuperAdmin';

    const vendorNavItems = [
        { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Products', path: '/dashboard/products', icon: Package },
        { name: 'Catalog Tools', path: '/dashboard/catalog-tools', icon: Boxes },
        { name: 'Orders', path: '/dashboard/orders', icon: ShoppingCart },
        { name: 'Customers', path: '/dashboard/customers', icon: Users },
        { name: 'Promotions', path: '/dashboard/promotions', icon: TicketPercent },
        { name: 'Banners', path: '/dashboard/banners', icon: Megaphone },
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

    return (
        <>
            {/* Mobile Dark Overlay Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* The Sidebar itself */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 h-screen flex flex-col 
                transform transition-transform duration-300 ease-in-out
                md:static md:translate-x-0 
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
                    <span className="text-2xl font-black text-indigo-600 tracking-tight">
                        {isSuperAdmin ? 'Platform.' : 'ScaleUp.'}
                    </span>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="md:hidden p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                    <nav className="space-y-1.5 px-4">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.path}
                                    end={item.path === '/dashboard'}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                            isActive
                                                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon className={`flex-shrink-0 mr-3 h-5 w-5 transition-colors ${
                                                isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                                            }`} />
                                            <span>{item.name}</span>
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
