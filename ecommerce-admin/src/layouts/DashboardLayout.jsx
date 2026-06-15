import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';
import { CircleHelp } from 'lucide-react';

const helpTextByPath = [
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
        match: '/dashboard/customers',
        title: 'Customers',
        body: 'This page shows shoppers for this store only. Use it to review customer history and contact customers when needed.'
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
        title: 'Store Builder',
        body: 'Banners are now managed inside Store Builder as flexible homepage sections.'
    },
    {
        match: '/dashboard/store-builder',
        title: 'Store Builder',
        body: 'Change colors, logo, homepage sections, checkout branding, policies, and navigation. Preview first, then save to publish.'
    },
    {
        match: '/dashboard/shipping',
        title: 'Shipping',
        body: 'Connect courier settings before sending confirmed orders. Keep pickup address and phone number accurate.'
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
    const location = useLocation();
    const helpText = getHelpText(location.pathname);

    // UX Improvement: Auto-close the mobile sidebar whenever the route changes.
    // This prevents the user from having to manually close the menu after clicking a link.
    useEffect(() => {
        queueMicrotask(() => setIsSidebarOpen(false));
    }, [location.pathname]);

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
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth transition-all duration-300">
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
                    </div>
                    <Outlet />
                </div>
            </main>
        </div>
    </div>
);
};

export default DashboardLayout;
