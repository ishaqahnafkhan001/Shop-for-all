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
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                ...formData,
                subdomain: formData.subdomain.trim().toLowerCase(),
            };

            await API.post("/auth/register", payload);
            setSuccess("Your store has been created successfully. You can now log in to manage it.");
            setFormData({
                shopName: "",
                subdomain: "",
                fullName: "",
                email: "",
                password: "",
            });
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create store. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-slate-50 selection:bg-[var(--sf-accent-ring)] overflow-hidden px-4 py-12">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-400/20 blur-[100px] pointer-events-none mix-blend-multiply"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[var(--sf-accent-soft)] opacity-60 blur-[100px] pointer-events-none mix-blend-multiply"></div>
            <div className="absolute top-[20%] right-[10%] w-[20vw] h-[20vw] rounded-full bg-cyan-400/10 blur-[80px] pointer-events-none mix-blend-multiply"></div>

            <div className="relative z-10 w-full max-w-xl rounded-[2rem] bg-white/80 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl border border-white/60">
                <div className="text-center mb-10">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--sf-accent)] to-[var(--sf-accent-hover)] shadow-lg shadow-[var(--sf-accent)]/30 mb-6">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                        Launch Your Store
                    </h1>
                    <p className="text-gray-500 font-medium">
                        Join the platform and start selling in minutes.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Status Messages */}
                    {error && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2">
                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>{success}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Store Name</label>
                            <input
                                name="shopName"
                                value={formData.shopName}
                                onChange={handleChange}
                                placeholder="e.g. Acme Corp"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[var(--sf-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--sf-accent-ring)] hover:border-gray-300"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Full Name</label>
                            <input
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[var(--sf-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--sf-accent-ring)] hover:border-gray-300"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Store URL</label>
                        <div className="group flex w-full items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 transition-all duration-200 focus-within:border-[var(--sf-accent)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[var(--sf-accent-ring)] hover:border-gray-300">
                            <span className="pl-4 pr-1 text-gray-400 font-medium select-none">https://</span>
                            <input
                                name="subdomain"
                                value={formData.subdomain}
                                onChange={handleChange}
                                placeholder="yourstore"
                                className="w-full bg-transparent py-3.5 text-gray-900 placeholder-gray-400 outline-none"
                                required
                            />
                            <span className="pr-4 pl-1 text-gray-400 font-medium select-none">.platform.com</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[var(--sf-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--sf-accent-ring)] hover:border-gray-300"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[var(--sf-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--sf-accent-ring)] hover:border-gray-300"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--sf-accent)] to-[var(--sf-accent-hover)] px-8 py-4 font-bold text-white shadow-[0_0_20px_var(--sf-accent-soft)] transition-all hover:scale-[1.01] hover:shadow-[0_0_25px_var(--sf-accent)] disabled:pointer-events-none disabled:opacity-70 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <>
                                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Setting up...</span>
                            </>
                        ) : (
                            <>
                                <span>Create Your Store</span>
                                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    By registering, you agree to our <a href="#" className="font-semibold text-[var(--sf-accent)] hover:text-[var(--sf-accent-hover)]">Terms of Service</a> and <a href="#" className="font-semibold text-[var(--sf-accent)] hover:text-[var(--sf-accent-hover)]">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
}