import React, { useState } from 'react';
import { Package, User, KeyRound, LogOut } from 'lucide-react';
import { OrderHistoryTab, ProfileTab } from './AccountTabsViews.jsx';

export default function CustomerDashboard({ adaptiveParts = false, user, orders, handleLogout, passForm, setPassForm, handlePasswordReset, presentationVariant, initialTab = 'orders', SecurityComponent }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const atelier = presentationVariant === 'atelier-editorial';

    return (
        <div className={atelier ? "sf-page atelier-dashboard" : "sf-page"}>
        <div className="sf-shell-wide py-6 sm:py-8">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="sf-kicker">Customer center</p>
                    <h1 data-ab-part={adaptiveParts ? 'heading' : undefined} className="sf-heading mt-1 text-3xl">My Account</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Welcome back, {user.fullName || user.email}</p>
                </div>
                <button data-ab-part={adaptiveParts ? 'primaryButton' : undefined} onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-red-600">
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            <div data-ab-part={adaptiveParts ? 'layout' : undefined} data-ab-layout={adaptiveParts ? 'account' : undefined} className="grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
                {/* LEFT SIDEBAR */}
                <div data-ab-surface={adaptiveParts ? '' : undefined} data-atelier-part={atelier ? "account-navigation" : undefined} className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:sticky md:top-28 md:self-start">
                    <button data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'primaryButton' : undefined} aria-pressed={(atelier || adaptiveParts) ? activeTab === 'orders' : undefined} onClick={() => setActiveTab('orders')} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${activeTab === 'orders' ? 'bg-[var(--sf-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Package size={20} /> Order History
                    </button>
                    <button data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'primaryButton' : undefined} aria-pressed={(atelier || adaptiveParts) ? activeTab === 'profile' : undefined} onClick={() => setActiveTab('profile')} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${activeTab === 'profile' ? 'bg-[var(--sf-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <User size={20} /> My Profile
                    </button>
                    <button data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'primaryButton' : undefined} aria-pressed={(atelier || adaptiveParts) ? activeTab === 'security' : undefined} onClick={() => setActiveTab('security')} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${activeTab === 'security' ? 'bg-[var(--sf-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <KeyRound size={20} /> Password Reset
                    </button>
                </div>

                {/* RIGHT CONTENT WRAPPER */}
                <div data-ab-surface={adaptiveParts ? '' : undefined} data-atelier-part={atelier ? "account-content" : undefined} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    {activeTab === 'orders' && <OrderHistoryTab adaptiveParts={adaptiveParts} orders={orders} presentationVariant={presentationVariant} />}
                    {activeTab === 'profile' && <ProfileTab adaptiveParts={adaptiveParts} user={user} />}
                    {activeTab === 'security' && <SecurityComponent adaptiveParts={adaptiveParts} presentationVariant={presentationVariant} passForm={passForm} setPassForm={setPassForm} handlePasswordReset={handlePasswordReset} />}
                </div>
            </div>
        </div>
        </div>
    );
}
