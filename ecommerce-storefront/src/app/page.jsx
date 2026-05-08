"use client";

import { useState } from "react";
import API from "../api/api";

export default function PlatformLandingPage() {
    const [formData, setFormData] = useState({
        shopName: "",
        subdomain: "",
        fullName: "",
        email: "",
        password: "",
        otp: "",
    });

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            await API.post("/auth/send-otp", { email: formData.email });
            setStep(2);
            setSuccess("Verification code sent!");
        } catch (err) {
            setError(err.response?.data?.error || "Failed to send code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const payload = {
                ...formData,
                subdomain: formData.subdomain.trim().toLowerCase(),
            };
            await API.post("/auth/register", payload);
            setSuccess("Store launched successfully! Redirecting...");

            setTimeout(() => {
                // 1. Grab the domain from your .env file
                const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000";

                // 2. Automatically detect http (local) vs https (production)
                const protocol = window.location.protocol;

                // 3. Build the final URL and redirect
                // Example: http://mystore.localhost:3000
                window.location.href = `${protocol}//${payload.subdomain}.${baseDomain}`;
            }, 1500);} catch (err) {
            setError(err.response?.data?.error || "Registration failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "w-full bg-white/50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white";

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-[#f8fafc] overflow-hidden px-4 py-12">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200/50 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[120px]" />

            <div className="relative z-10 w-full max-w-lg">
                {/* Minimal Progress Bar */}
                <div className="flex items-center justify-center gap-2 mb-12">
                    <div className={`h-1 rounded-full transition-all duration-700 ${step >= 1 ? "w-8 bg-indigo-600" : "w-2 bg-slate-200"}`} />
                    <div className={`h-1 rounded-full transition-all duration-700 ${step >= 2 ? "w-8 bg-indigo-600" : "w-2 bg-slate-200"}`} />
                </div>

                <div className="bg-white/70 backdrop-blur-3xl border border-white rounded-[3rem] p-10 md:p-14 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-semibold text-slate-900 tracking-tight mb-3">
                            {step === 1 ? "Create your store" : "Verify email"}
                        </h1>
                        <p className="text-slate-500 font-medium">
                            {step === 1 ? "The first step toward your new empire." : `Enter the 6-digit code sent to ${formData.email}`}
                        </p>
                    </div>

                    {error && <div className="mb-8 p-4 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl text-center">{error}</div>}
                    {success && <div className="mb-8 p-4 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">{success}</div>}

                    {step === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest font-bold text-slate-400 ml-1">Store Name</label>
                                    <input name="shopName" value={formData.shopName} onChange={handleChange} placeholder="Elite Threads" className={inputClass} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest font-bold text-slate-400 ml-1">Owner Name</label>
                                    <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Ishaq Khan" className={inputClass} required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest font-bold text-slate-400 ml-1">Store URL</label>
                                <div className="relative flex items-center">
                                    <input name="subdomain" value={formData.subdomain} onChange={handleChange} placeholder="mystore" className={`${inputClass} pr-32`} required />
                                    <span className="absolute right-5 text-slate-400 font-bold text-sm">.platform.com</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest font-bold text-slate-400 ml-1">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@domain.com" className={inputClass} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest font-bold text-slate-400 ml-1">Password</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className={inputClass} required />
                            </div>

                            <button type="submit" disabled={isLoading} className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center mt-4">
                                {isLoading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Continue"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleFinalRegister} className="space-y-10">
                            <div className="flex flex-col items-center">
                                <input
                                    name="otp"
                                    value={formData.otp}
                                    onChange={handleChange}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="w-full bg-transparent text-center text-5xl tracking-[1.5rem] font-light text-slate-900 outline-none placeholder:text-slate-100"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="space-y-4">
                                <button type="submit" disabled={isLoading} className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center">
                                    {isLoading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Launch Store"}
                                </button>
                                <button type="button" onClick={() => setStep(1)} className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                                    ← Edit details
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}