import React, { useState } from 'react';
import { Package, User, KeyRound, LogOut } from 'lucide-react';
import { OrderHistoryTab, ProfileTab, SecurityTab } from './CustomerTabs'; // Adjust import path

export default function CustomerDashboard({ user, orders, handleLogout, passForm, setPassForm, handlePasswordReset }) {
    const [activeTab, setActiveTab] = useState('orders');

    return (
        <div className="sf-page">
        <div className="sf-shell-wide py-6 sm:py-8">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="sf-kicker">Customer center</p>
                    <h1 className="sf-heading mt-1 text-3xl">My Account</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Welcome back, {user.fullName || user.email}</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-red-600">
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
                {/* LEFT SIDEBAR */}
                <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:sticky md:top-28 md:self-start">
                    <button onClick={() => setActiveTab('orders')} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${activeTab === 'orders' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Package size={20} /> Order History
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${activeTab === 'profile' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <User size={20} /> My Profile
                    </button>
                    <button onClick={() => setActiveTab('security')} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${activeTab === 'security' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <KeyRound size={20} /> Password Reset
                    </button>
                </div>

                {/* RIGHT CONTENT WRAPPER */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    {activeTab === 'orders' && <OrderHistoryTab orders={orders} />}
                    {activeTab === 'profile' && <ProfileTab user={user} />}
                    {activeTab === 'security' && <SecurityTab passForm={passForm} setPassForm={setPassForm} handlePasswordReset={handlePasswordReset} />}
                </div>
            </div>
        </div>
        </div>
    );
}
