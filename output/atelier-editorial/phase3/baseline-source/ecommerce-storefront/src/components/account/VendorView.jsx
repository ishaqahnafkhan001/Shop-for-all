import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function VendorView({ user, handleLogout }) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL
    return (
        <div className="sf-page flex min-h-[70vh] items-center justify-center px-4 py-10">
            <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-8 text-center text-white shadow-2xl sm:p-10">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="relative z-10">
                    <ShieldCheck size={48} className="mx-auto mb-6 text-cyan-200" />
                    <h1 className="mb-2 text-3xl font-black">Management Portal</h1>
                    <p className="mx-auto mb-8 max-w-md text-sm leading-6 text-white/58">
                        Hello, <span className="text-white font-semibold">{user.fullName}</span>.
                        You are logged in as <span className="font-bold text-cyan-200">{user.role}</span>.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="sf-btn bg-white px-8 text-slate-950 hover:bg-cyan-50">
                            Open Admin Panel <ArrowRight size={18} />
                        </a>
                        <button onClick={handleLogout} className="sf-btn px-8 text-white/72 hover:bg-white/10 hover:text-white">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
