import React from 'react';

export default function AuthView({
                                     isRegistering,
                                     setIsRegistering,
                                     authForm,
                                     setAuthForm,
                                     handleAuthSubmit,
                                     otpSent,
                                     handleSendOTP,
                                     otpTimer,
                                     otpLoading
                                 }) {

    // Helper to format seconds into MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="sf-page flex min-h-[70vh] items-center justify-center px-4 py-10">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
                <p className="sf-kicker mb-2">{isRegistering ? 'Customer account' : 'Welcome back'}</p>
                <h1 className="mb-2 text-3xl font-black text-slate-950">
                    {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h1>
                <p className="mb-6 text-sm leading-6 text-slate-500">
                    {isRegistering ? 'Create a shop-specific customer account to track orders and review purchases.' : 'Sign in to view orders, tracking, and account details.'}
                </p>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {isRegistering && (
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">Full Name</label>
                            <input
                                required
                                type="text"
                                value={authForm.fullName}
                                onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                                disabled={otpSent}
                                className="sf-field disabled:bg-slate-50 disabled:text-slate-400"
                            />
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-700">Email Address</label>
                        <input
                            required
                            type="email"
                            value={authForm.email}
                            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                            disabled={isRegistering && otpSent}
                            className="sf-field disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
                        <input
                            required
                            type="password"
                            value={authForm.password}
                            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                            disabled={isRegistering && otpSent}
                            className="sf-field disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    </div>

                    {isRegistering && otpSent && (
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">Verification Code</label>
                            <input
                                required
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={authForm.otp}
                                onChange={(e) => setAuthForm({ ...authForm, otp: e.target.value })}
                                className="sf-field border-indigo-200 bg-indigo-50/30"
                            />

                            {/* Resend Logic */}
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-slate-500">Check your email for the code.</p>
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={otpTimer > 0 || otpLoading}
                                    className={`text-xs font-bold ${otpTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                                >
                                    {otpLoading ? 'Sending...' : otpTimer > 0 ? `Resend in ${formatTime(otpTimer)}` : 'Resend Code'}
                                </button>
                            </div>
                        </div>
                    )}

                    {isRegistering && !otpSent ? (
                        <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={otpTimer > 0 || otpLoading}
                            className="sf-btn sf-btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            {otpLoading && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                            {otpLoading ? 'Sending code...' : otpTimer > 0 ? `Please wait ${formatTime(otpTimer)}` : 'Send Verification Code'}
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="sf-btn sf-btn-primary mt-4 w-full"
                        >
                            {isRegistering ? 'Verify & Sign Up' : 'Sign In'}
                        </button>
                    )}
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm font-bold text-slate-600 hover:text-slate-950"
                    >
                        {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
