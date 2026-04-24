import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function VendorView({ user, handleLogout }) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <div className="bg-gray-900 text-white p-10 rounded-[2rem] text-center relative overflow-hidden border border-gray-800 shadow-2xl">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="relative z-10">
                    <ShieldCheck size={48} className="mx-auto mb-6 text-indigo-400" />
                    <h1 className="text-3xl font-bold mb-2">Management Portal</h1>
                    <p className="text-gray-400 mb-10 max-w-md mx-auto">
                        Hello, <span className="text-white font-semibold">{user.fullName}</span>.
                        You are logged in as <span className="text-indigo-400 font-medium">{user.role}</span>.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white text-gray-900 px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-50 transition-all transform hover:scale-105">
                            Open Admin Panel <ArrowRight size={18} />
                        </a>
                        <button onClick={handleLogout} className="px-8 py-3.5 rounded-xl font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}