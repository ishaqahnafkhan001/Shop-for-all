import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    // UX Improvement: Auto-close the mobile sidebar whenever the route changes.
    // This prevents the user from having to manually close the menu after clicking a link.
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    return (

    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-blue-100 selection:text-blue-900">

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
                    <Outlet />
                </div>
            </main>
        </div>
    </div>
);
};

export default DashboardLayout;