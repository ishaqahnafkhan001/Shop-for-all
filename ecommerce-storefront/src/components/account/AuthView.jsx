import React from 'react';

export default function AuthView({ isRegistering, setIsRegistering, authForm, setAuthForm, handleAuthSubmit }) {
    return (
        <div className="container mx-auto px-4 py-16 max-w-md">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h1>
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {isRegistering && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input required type="text" value={authForm.fullName} onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input required type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input required type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                    </div>

                    <button type="submit" className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors mt-4">
                        {isRegistering ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                        {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}