import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, X } from 'lucide-react';

// 1. Accept the state props
const Sidebar = ({ isOpen, setIsOpen }) => {
    const navItems = [
        { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Products', path: '/dashboard/products', icon: Package },
        { name: 'Orders', path: '/dashboard/orders', icon: ShoppingCart },
        { name: 'Customers', path: '/dashboard/customers', icon: Users },
        { name: 'Settings', path: '/dashboard/settings', icon: Settings },
    ];

    return (
        <>
            {/* 2. Mobile Dark Overlay Backdrop */}
            {/* Clicking this dark background will close the menu */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* 3. The Sidebar itself */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 h-screen flex flex-col 
                transform transition-transform duration-300 ease-in-out
                md:static md:translate-x-0 /* Always visible on Desktop */
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} /* Slide in/out on Mobile */
            `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
                    <span className="text-2xl font-black text-indigo-600 tracking-tight">ScaleUp.</span>

                    {/* Mobile Close Button (X) */}
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
                                    // 4. Close the menu automatically when a user clicks a link on mobile!
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                            isActive
                                                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`
                                    }
                                >
                                    <Icon className={`flex-shrink-0 mr-3 h-5 w-5 transition-colors ${
                                        ({isActive}) => isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                                    }`} />
                                    <span>{item.name}</span>
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