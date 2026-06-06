import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, ExternalLink, Store } from 'lucide-react';

const Topbar = ({ onOpenMenu }) => {
    const { user, logout } = useAuth();

    const subdomain = user?.shop?.subdomain || user?.subdomain || 'demo';

    let baseDomain = import.meta.env.VITE_API_DOMAIN || 'localhost:3000';
    baseDomain = baseDomain.replace(/^https?:\/\//, '');

    const protocol = baseDomain.includes('localhost') ? 'http://' : 'https://';
    const liveStoreUrl = `${protocol}${subdomain}.${baseDomain}`;

    return (
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur sm:px-6">
            <button
                onClick={onOpenMenu}
                className="rounded-lg p-2 -ml-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
                aria-label="Open navigation"
            >
                <Menu className="h-6 w-6" />
            </button>

            <div className="hidden items-center gap-2 text-sm font-semibold text-slate-600 md:flex">
                <Store className="h-4 w-4 text-indigo-600" />
                <span>{user?.shop?.name || user?.shop?.shopName || 'Store admin'}</span>
            </div>

            <div className="flex items-center gap-3">

                {user?.role !== 'SuperAdmin' && (
                    <>
                        <a
                            href={liveStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-700 sm:flex"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Live Store
                        </a>

                        <div className="hidden h-6 w-px bg-slate-200 sm:block"></div>
                    </>
                )}

                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold uppercase text-white shadow-sm">
                        {user?.fullName?.charAt(0) || 'V'}
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <span className="mb-1 text-sm font-semibold leading-none text-slate-800">
                            {user?.fullName || 'Vendor Admin'}
                        </span>
                        <span className="text-xs leading-none text-slate-500">
                            {user?.role || 'Admin'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Log out"
                    aria-label="Log out"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
};

export default Topbar;
