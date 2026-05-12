import React from 'react';

export default function AuthView({
                                     isRegistering,
                                     setIsRegistering,
                                     authForm,
                                     setAuthForm,
                                     handleAuthSubmit,
                                     otpSent,
                                     handleSendOTP,
                                     otpTimer // <-- Receive the new prop
                                 }) {

    // Helper to format seconds into MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

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
                            <input
                                required
                                type="text"
                                value={authForm.fullName}
                                onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                                disabled={otpSent}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            required
                            type="email"
                            value={authForm.email}
                            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                            disabled={isRegistering && otpSent}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            required
                            type="password"
                            value={authForm.password}
                            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                            disabled={isRegistering && otpSent}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                    </div>

                    {isRegistering && otpSent && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                            <input
                                required
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={authForm.otp}
                                onChange={(e) => setAuthForm({ ...authForm, otp: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-600 outline-none"
                            />

                            {/* Resend Logic */}
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-gray-500">Check your email for the code.</p>
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={otpTimer > 0}
                                    className={`text-xs font-semibold ${otpTimer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                                >
                                    {otpTimer > 0 ? `Resend in ${formatTime(otpTimer)}` : 'Resend Code'}
                                </button>
                            </div>
                        </div>
                    )}

                    {isRegistering && !otpSent ? (
                        <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={otpTimer > 0}
                            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {otpTimer > 0 ? `Please wait ${formatTime(otpTimer)}` : 'Send Verification Code'}
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors mt-4"
                        >
                            {isRegistering ? 'Verify & Sign Up' : 'Sign In'}
                        </button>
                    )}
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                        {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}