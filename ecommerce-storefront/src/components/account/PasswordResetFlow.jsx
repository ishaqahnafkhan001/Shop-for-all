"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '@/api/api';

const emptyOtp = () => Array(6).fill('');

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const getPasswordChecks = (password) => ({
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
});

const getStrengthLabel = (score) => {
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Good';
    return 'Strong';
};

const getCurrentSubdomain = () => {
    if (typeof window === 'undefined') return '';

    const hostname = window.location.hostname.toLowerCase();
    const reservedHosts = ['localhost', '127.0.0.1', 'scaleup.codes', 'www.scaleup.codes', 'shop.scaleup.codes', 'admin.scaleup.codes'];

    if (hostname.includes('.localhost')) {
        const localSubdomain = hostname.split('.localhost')[0];
        return localSubdomain && localSubdomain !== 'localhost' ? localSubdomain : '';
    }

    if (hostname.endsWith('.scaleup.codes')) {
        const [tenant] = hostname.split('.');
        return ['www', 'api', 'admin', 'shop', 'scaleup'].includes(tenant) ? '' : tenant;
    }

    return reservedHosts.includes(hostname) ? '' : hostname;
};

export default function PasswordResetFlow({ subdomain, onBack, onComplete }) {
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(emptyOtp);
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const otpRefs = useRef([]);

    const checks = useMemo(() => getPasswordChecks(password), [password]);
    const score = Object.values(checks).filter(Boolean).length;
    const otpValue = otp.join('');
    const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
    const canReset = score === 5 && passwordsMatch && Boolean(resetToken);
    const tenantSubdomain = useMemo(
        () => String(subdomain || getCurrentSubdomain() || '').trim().toLowerCase(),
        [subdomain]
    );

    useEffect(() => {
        if (resendTimer <= 0) return undefined;

        const interval = setInterval(() => {
            setResendTimer((value) => Math.max(0, value - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [resendTimer]);

    const requestOtp = async (event) => {
        event?.preventDefault();
        if (!email.trim()) return toast.error('Enter your email address first.');
        if (!tenantSubdomain) return toast.error('Store context is missing. Please open this page from your store subdomain.');
        if (resendTimer > 0) return undefined;

        setLoading(true);
        try {
            const { data } = await API.post('/auth/forgot-password', {
                email,
                subdomain: tenantSubdomain,
                audience: 'customer'
            });

            toast.success(data.message || 'If an account exists, an OTP has been sent.');
            setStep('otp');
            setResendTimer(60);
            setTimeout(() => otpRefs.current[0]?.focus(), 50);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Could not send reset code.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (event) => {
        event.preventDefault();
        if (otpValue.length !== 6) return toast.error('Enter the 6-digit verification code.');

        setLoading(true);
        try {
            const { data } = await API.post('/auth/verify-reset-otp', {
                email,
                otp: otpValue,
                subdomain: tenantSubdomain,
                audience: 'customer'
            });

            setResetToken(data.resetToken);
            setStep('password');
            toast.success('Code verified. Create your new password.');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Invalid or expired verification code.');
            setOtp(emptyOtp());
            setTimeout(() => otpRefs.current[0]?.focus(), 50);
        } finally {
            setLoading(false);
        }
    };

    const submitNewPassword = async (event) => {
        event.preventDefault();
        if (!canReset) return toast.error('Use a strong password and make sure both passwords match.');

        setLoading(true);
        try {
            await API.post('/auth/reset-password', {
                email,
                resetToken,
                password,
                confirmPassword,
                subdomain: tenantSubdomain,
                audience: 'customer'
            });

            toast.success('Password changed. Please sign in with your new password.');
            onComplete?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Password reset failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        setOtp((current) => {
            const next = [...current];
            next[index] = digit;
            return next;
        });

        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, event) => {
        if (event.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (event) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;

        const next = emptyOtp();
        pasted.split('').forEach((digit, index) => {
            next[index] = digit;
        });
        setOtp(next);
        otpRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
    };

    return (
        <div className="sf-page flex min-h-[70vh] items-center justify-center px-4 py-10">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
                <p className="sf-kicker mb-2">Secure recovery</p>
                <h1 className="mb-2 text-3xl font-black text-slate-950">Reset password</h1>
                <p className="mb-6 text-sm leading-6 text-slate-500">
                    We will send a one-time verification code if this email belongs to this store.
                </p>

                {step === 'email' && (
                    <form onSubmit={requestOtp} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">Email Address</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="sf-field"
                                placeholder="you@example.com"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="sf-btn sf-btn-primary w-full disabled:opacity-60">
                            {loading && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                            {loading ? 'Sending code...' : 'Send reset code'}
                        </button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={verifyOtp} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">Verification Code</label>
                            <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(element) => {
                                            otpRefs.current[index] = element;
                                        }}
                                        value={digit}
                                        onChange={(event) => handleOtpChange(index, event.target.value)}
                                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                                        inputMode="numeric"
                                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                        maxLength={1}
                                        className="h-12 rounded-2xl border border-slate-200 text-center text-lg font-black text-slate-950 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                        aria-label={`Verification digit ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                                <span>Code expires in 10 minutes.</span>
                                <button
                                    type="button"
                                    onClick={requestOtp}
                                    disabled={loading || resendTimer > 0}
                                    className="font-black text-[var(--sf-accent)] hover:text-[var(--sf-accent-hover)] disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                    {resendTimer > 0 ? `Resend in ${formatTime(resendTimer)}` : 'Resend code'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading || otpValue.length !== 6} className="sf-btn sf-btn-primary w-full disabled:opacity-60">
                            {loading ? 'Verifying...' : 'Verify code'}
                        </button>
                    </form>
                )}

                {step === 'password' && (
                    <form onSubmit={submitNewPassword} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">New Password</label>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="sf-field"
                                placeholder="Create a strong password"
                            />
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between text-xs font-black">
                                <span className="text-slate-500">Password strength</span>
                                <span className={score === 5 ? 'text-emerald-600' : 'text-amber-600'}>
                                    {getStrengthLabel(score)}
                                </span>
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <span
                                        key={index}
                                        className={`h-1.5 rounded-full ${index < score ? 'bg-[var(--sf-accent)]' : 'bg-slate-200'}`}
                                    />
                                ))}
                            </div>
                            <ul className="mt-3 grid gap-1 text-xs text-slate-500">
                                <li className={checks.length ? 'text-emerald-600' : ''}>At least 8 characters</li>
                                <li className={checks.upper && checks.lower ? 'text-emerald-600' : ''}>Uppercase and lowercase letters</li>
                                <li className={checks.number ? 'text-emerald-600' : ''}>At least one number</li>
                                <li className={checks.special ? 'text-emerald-600' : ''}>At least one special character</li>
                            </ul>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-slate-700">Confirm Password</label>
                            <input
                                required
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="sf-field"
                                placeholder="Repeat your new password"
                            />
                            {confirmPassword && !passwordsMatch && (
                                <p className="mt-2 text-xs font-bold text-red-600">Passwords do not match.</p>
                            )}
                        </div>

                        <button type="submit" disabled={loading || !canReset} className="sf-btn sf-btn-primary w-full disabled:opacity-60">
                            {loading ? 'Changing password...' : 'Change password'}
                        </button>
                    </form>
                )}

                <button
                    type="button"
                    onClick={onBack}
                    className="mt-6 w-full text-center text-sm font-black text-slate-600 hover:text-slate-950"
                >
                    Back to sign in
                </button>
            </div>
        </div>
    );
}
