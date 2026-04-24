import React, { useState } from 'react';
import { Package, User, KeyRound, LogOut } from 'lucide-react';
import { OrderHistoryTab, ProfileTab, SecurityTab } from './CustomerTabs'; // Adjust import path

export default function CustomerDashboard({ user, orders, handleLogout, passForm, setPassForm, handlePasswordReset }) {
    const [activeTab, setActiveTab] = useState('orders');

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="flex justify-between items-end mb-10 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
                    <p className="text-gray-500">Welcome back, {user.fullName || user.email}</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition font-medium text-sm">
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-10">
                {/* LEFT SIDEBAR */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                    <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'orders' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <Package size={20} /> Order History
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'profile' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <User size={20} /> My Profile
                    </button>
                    <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'security' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <KeyRound size={20} /> Password Reset
                    </button>
                </div>

                {/* RIGHT CONTENT WRAPPER */}
                <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-sm">
                    {activeTab === 'orders' && <OrderHistoryTab orders={orders} />}
                    {activeTab === 'profile' && <ProfileTab user={user} />}
                    {activeTab === 'security' && <SecurityTab passForm={passForm} setPassForm={setPassForm} handlePasswordReset={handlePasswordReset} />}
                </div>
            </div>
        </div>
    );
}