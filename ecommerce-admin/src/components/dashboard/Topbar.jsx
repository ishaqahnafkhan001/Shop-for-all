import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, ExternalLink } from 'lucide-react';

// 1. Accept the onOpenMenu prop
const Topbar = ({ onOpenMenu }) => {
    const { user, logout } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shadow-sm">
            {/* 2. Attach the onClick event to the button */}
            <button
                onClick={onOpenMenu}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            >
                <Menu className="h-6 w-6" />
            </button>

            <div className="hidden md:block"></div>

            <div className="flex items-center space-x-4">
                <button className="hidden sm:flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Live Store
                </button>

                <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

                <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-inner uppercase">
                        {user?.fullName?.charAt(0) || 'V'}
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <span className="text-sm font-semibold text-gray-700 leading-none mb-1">
                            {user?.fullName || 'Vendor Admin'}
                        </span>
                        <span className="text-xs text-gray-500 leading-none">
                            {user?.role || 'Admin'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="ml-2 p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                    title="Log out"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
};

export default Topbar;