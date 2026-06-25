"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    ArrowRight,
    BadgeCheck,
    BarChart3,
    Boxes,
    Check,
    CreditCard,
    Globe2,
    LayoutDashboard,
    LockKeyhole,
    Mail,
    Menu,
    Package,
    Palette,
    ReceiptText,
    SearchCheck,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Store,
    Truck,
    Users,
    X,
    Zap,
} from "lucide-react";
import API from "../api/api";
import {
    businessOutcomes,
    faqItems,
    footerColumns,
    howItWorksSteps,
    localSellerCards,
    navLinks,
    platformModules,
    pricingPlans,
    proofCards,
    trustChips,
} from "./landingContent";

const iconMap = {
    brand: Palette,
    catalog: Package,
    orders: Truck,
    growth: BarChart3,
    social: Users,
    cod: ReceiptText,
    payments: CreditCard,
    mobile: ShoppingBag,
};

const proofIcons = [Store, ShoppingBag, LayoutDashboard, Truck, BarChart3, Palette];

const getBaseDomain = () => {
    const configured = (process.env.NEXT_PUBLIC_BASE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (process.env.NODE_ENV === "production") {
        return configured && !configured.includes("localhost") ? configured : "scaleup.codes";
    }
    return configured || "scaleup.codes";
};

function SectionHeading({ eyebrow, title, text, align = "center", tone = "light" }) {
    const dark = tone === "dark";

    return (
        <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : "text-left"}`}>
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${dark ? "text-cyan-200" : "text-indigo-600"}`}>
                {eyebrow}
            </p>
            <h2 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${dark ? "text-white" : "text-slate-950"}`}>
                {title}
            </h2>
            <p className={`mt-4 text-base leading-7 sm:text-lg ${dark ? "text-white/62" : "text-slate-600"}`}>
                {text}
            </p>
        </div>
    );
}

function TextField({ label, helper, error, suffix, ...props }) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <span className="relative mt-2 block">
                <input
                    {...props}
                    aria-invalid={Boolean(error)}
                    className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${
                        suffix ? "pr-36 sm:pr-48" : ""
                    } ${error ? "border-red-300" : "border-slate-200"}`}
                />
                {suffix && (
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex max-w-[44%] items-center truncate text-xs font-bold text-slate-400">
                        {suffix}
                    </span>
                )}
            </span>
            <span className={`mt-2 block text-xs leading-5 ${error ? "text-red-600" : "text-slate-500"}`}>
                {error || helper}
            </span>
        </label>
    );
}

function CommerceSystemVisual() {
    return (
        <div className="landing-perspective relative mx-auto w-full max-w-6xl" aria-label="Scaleup dashboard and storefront preview">
            <div className="landing-float-slow relative">
                <div className="landing-tilt relative rounded-[2rem] border border-white/16 bg-white/[0.08] p-3 shadow-[0_32px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
                    <div className="rounded-[1.6rem] border border-white/12 bg-slate-950/92 p-4 text-white">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950">
                                    <Store size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Scaleup Command</p>
                                    <p className="text-xs text-white/45">Vendor operating dashboard</p>
                                </div>
                            </div>
                            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200 sm:flex">
                                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                                Preview
                            </div>
                        </div>

                        <div className="grid gap-3 pt-4 lg:grid-cols-[0.72fr_1fr]">
                            <div className="space-y-3">
                                {[
                                    ["Revenue", "BDT-ready", "Manual"],
                                    ["Orders", "Trackable", "COD flow"],
                                    ["Growth", "Insights", "SEO tools"],
                                ].map(([label, value, change]) => (
                                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</p>
                                            <p className="text-xs font-bold text-emerald-200">{change}</p>
                                        </div>
                                        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                                    </div>
                                ))}
                                <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-xs font-bold uppercase tracking-widest text-cyan-100/70">Setup score</p>
                                        <p className="text-xs font-black text-cyan-100">Ready</p>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <div className="landing-progress h-full rounded-full bg-cyan-200" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1.4rem] bg-[#f7f9fc] p-4 text-slate-950">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Storefront</p>
                                        <h3 className="mt-1 text-2xl font-semibold tracking-tight">Mobile shop preview</h3>
                                    </div>
                                    <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                                        Shop
                                    </div>
                                </div>
                                <div className="mt-5 grid grid-cols-3 gap-3">
                                    {["Panjabi", "Saree", "Sneaker"].map((name, index) => (
                                        <div key={name} className="rounded-2xl border border-white/70 bg-white p-3 shadow-xl shadow-slate-950/10">
                                            <div className={`flex aspect-square items-center justify-center rounded-xl ${
                                                index === 0 ? "bg-emerald-100 text-emerald-700" : index === 1 ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"
                                            }`}>
                                                <Package size={24} />
                                            </div>
                                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Preview</p>
                                            <p className="mt-1 truncate text-sm font-bold text-slate-950">{name}</p>
                                            <p className="mt-1 text-sm font-black text-indigo-700">৳</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-bold text-slate-400">Theme</p>
                                        <p className="mt-2 text-sm font-black text-slate-950">Brand ready</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-bold text-slate-400">Catalog</p>
                                        <p className="mt-2 text-sm font-black text-slate-950">Products live</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="landing-float absolute -right-2 top-6 hidden w-52 rounded-3xl border border-white/70 bg-white/92 p-4 text-slate-950 shadow-2xl shadow-slate-950/20 backdrop-blur md:block">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <Zap size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">After signup</p>
                            <p className="text-lg font-black">Setup checklist</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LandingPageClient() {
    const [formData, setFormData] = useState({
        shopName: "",
        subdomain: "",
        fullName: "",
        email: "",
        password: "",
        otp: "",
    });
    const [step, setStep] = useState(1);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const baseDomain = getBaseDomain();

    const validation = useMemo(() => {
        const emailValid = /^\S+@\S+\.\S+$/.test(formData.email.trim());
        const subdomainValid = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(formData.subdomain.trim().toLowerCase());

        return {
            shopName: formData.shopName.trim().length < 2 ? "Use at least 2 characters for your store name." : "",
            fullName: formData.fullName.trim().length < 2 ? "Enter the owner name customers and staff can recognize." : "",
            subdomain: !formData.subdomain.trim()
                ? `Your store will be available at yourstore.${baseDomain}`
                : subdomainValid
                    ? ""
                    : "Use 3-63 lowercase letters, numbers, or hyphens. Start and end with a letter or number.",
            email: !formData.email.trim() ? "We will send your verification code here." : emailValid ? "" : "Enter a valid email address.",
            password: formData.password.length < 8 ? "Use at least 8 characters." : "",
            otp: formData.otp.trim().length !== 6 ? "Enter the 6-digit code sent to your email." : "",
        };
    }, [formData, baseDomain]);

    const completedFields = ["shopName", "subdomain", "fullName", "email", "password"].filter((field) => !validation[field]).length;
    const setupProgress = Math.round((completedFields / 5) * 100);

    const handleChange = (event) => {
        const { name, value } = event.target;
        const nextValue = name === "subdomain" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value;
        setFormData((prev) => ({ ...prev, [name]: nextValue }));
        setError("");
        setSuccess("");
    };

    const scrollToSection = (id) => {
        setMobileMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleSendOtp = async (event) => {
        event.preventDefault();
        const stepErrors = ["shopName", "subdomain", "fullName", "email", "password"].filter((field) => validation[field]);
        if (stepErrors.length > 0) {
            setError("Please fix the highlighted fields before continuing.");
            return;
        }

        setIsLoading(true);
        setError("");
        try {
            await API.post("/auth/send-otp", { email: formData.email.trim() });
            setStep(2);
            setSuccess("Verification code sent. Check your inbox to launch your store.");
        } catch (err) {
            setError(err.response?.data?.error || "Could not send the verification code. Please check your email and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalRegister = async (event) => {
        event.preventDefault();
        if (validation.otp) {
            setError(validation.otp);
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const payload = {
                ...formData,
                shopName: formData.shopName.trim(),
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                subdomain: formData.subdomain.trim().toLowerCase(),
                otp: formData.otp.trim(),
            };
            await API.post("/auth/register", payload);
            setSuccess("Store launched successfully. Redirecting to your storefront...");

            setTimeout(() => {
                const protocol = window.location.protocol;
                window.location.href = `${protocol}//${payload.subdomain}.${baseDomain}`;
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed. The code may be expired or the store URL may already be taken.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main id="top" className="landing-shell min-h-screen bg-white text-slate-950">
            <section className="landing-hero relative isolate overflow-hidden text-white">
                <div className="absolute inset-0 -z-10 landing-grid opacity-45" />
                <div className="mx-auto flex min-h-[calc(100svh-24px)] w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
                    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Main navigation">
                        <a href="#top" className="flex items-center gap-3" aria-label="Scaleup home">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-2xl shadow-white/10">
                                <Store size={22} />
                            </span>
                            <span className="text-lg font-semibold tracking-tight">Scaleup</span>
                        </a>

                        <div className="hidden items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] p-1 text-xs font-bold text-white/72 backdrop-blur lg:flex">
                            {navLinks.map((link) => (
                                <button
                                    key={link.href}
                                    type="button"
                                    onClick={() => scrollToSection(link.href.slice(1))}
                                    className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white"
                                >
                                    {link.label}
                                </button>
                            ))}
                        </div>

                        <div className="hidden items-center gap-2 md:flex">
                            <Link href="/login" className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-black text-white transition hover:bg-white hover:text-slate-950">
                                Login
                            </Link>
                            <button
                                type="button"
                                onClick={() => scrollToSection("registration")}
                                className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-50"
                            >
                                Create Store
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white md:hidden"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        {mobileMenuOpen && (
                            <div className="w-full rounded-3xl border border-white/12 bg-slate-950/88 p-3 shadow-2xl backdrop-blur md:hidden">
                                <div className="grid gap-1">
                                    {navLinks.map((link) => (
                                        <button
                                            key={link.href}
                                            type="button"
                                            onClick={() => scrollToSection(link.href.slice(1))}
                                            className="rounded-2xl px-4 py-3 text-left text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white"
                                        >
                                            {link.label}
                                        </button>
                                    ))}
                                    <Link href="/login" className="rounded-2xl px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white">
                                        Login
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => scrollToSection("registration")}
                                        className="mt-1 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"
                                    >
                                        Create Store
                                    </button>
                                </div>
                            </div>
                        )}
                    </nav>

                    <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
                        <div className="relative z-10 max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/78 backdrop-blur">
                                <Sparkles size={16} className="text-cyan-200" />
                                Built for Bangladesh online sellers
                            </div>

                            <h1 className="mt-7 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                                Launch Your Online Store Without Coding
                            </h1>
                            <p className="mt-6 max-w-xl text-base leading-8 text-white/68 sm:text-lg">
                                Create a professional storefront, manage products, orders, customers, themes, and growth tools from one simple dashboard.
                            </p>
                            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-cyan-100/80">
                                Create your store, verify your email, and open your vendor dashboard in minutes.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => scrollToSection("registration")}
                                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-slate-950 shadow-2xl shadow-cyan-200/10 transition hover:-translate-y-0.5 hover:bg-cyan-50"
                                >
                                    Start 14-Day Free Trial
                                    <ArrowRight size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollToSection("store-preview")}
                                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-7 text-sm font-black text-white backdrop-blur transition hover:bg-white/[0.14]"
                                >
                                    <SearchCheck size={17} />
                                    View Store Preview
                                </button>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-2">
                                {trustChips.map((chip) => (
                                    <span key={chip} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white/72 backdrop-blur">
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="relative z-10 lg:-mr-10">
                            <CommerceSystemVisual />
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y border-slate-200 bg-white px-5 py-6 sm:px-8 lg:px-10" aria-label="Business outcomes">
                <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {businessOutcomes.map((outcome) => (
                        <div key={outcome} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <Check size={15} strokeWidth={3} />
                            </span>
                            <p className="text-sm font-semibold leading-6 text-slate-800">{outcome}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="features" className="bg-[#f7f9fc] px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                    <SectionHeading
                        align="left"
                        eyebrow="Features"
                        title="A business operating system, not just a registration form"
                        text="Scaleup helps sellers launch, operate, and improve an online store with connected tools for branding, catalog, orders, and growth."
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        {platformModules.map((module) => {
                            const Icon = iconMap[module.key] || BadgeCheck;
                            return (
                                <article key={module.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                                            <Icon size={22} />
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-1.5">
                                            {module.metrics.map((metric) => (
                                                <span key={metric} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                                                    {metric}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <h3 className="mt-5 text-xl font-semibold text-slate-950">{module.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{module.text}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <SectionHeading
                        eyebrow="Local commerce"
                        title="Made for local sellers who want to sell online faster"
                        text="Scaleup is built around practical seller workflows for Bangladesh small businesses, social sellers, boutiques, and local brands."
                    />
                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {localSellerCards.map((card) => {
                            const Icon = iconMap[card.key] || Store;
                            return (
                                <article key={card.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                                        <Icon size={22} />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold text-slate-950">{card.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="store-preview" className="bg-slate-950 px-5 py-16 text-white sm:px-8 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <SectionHeading
                        tone="dark"
                        eyebrow="Product proof"
                        title="What your store can include"
                        text="These are product interface previews based on the current Scaleup platform modules. They are shown as previews, not fake customer results."
                    />
                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {proofCards.map((card, index) => {
                            const Icon = proofIcons[index % proofIcons.length];
                            return (
                                <article key={card.title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
                                            <Icon size={22} />
                                        </div>
                                        <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-black text-cyan-100">
                                            Preview
                                        </span>
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-white/62">{card.text}</p>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="pricing" className="bg-[#f7f9fc] px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <SectionHeading
                        eyebrow="Pricing"
                        title="Simple pricing for growing online sellers"
                        text="Start free, choose a plan when you are ready to run your store seriously."
                    />
                    <p className="mx-auto mt-4 max-w-xl text-center text-sm font-bold text-emerald-700">
                        All plans start with a 14-day free trial. No card required.
                    </p>
                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {pricingPlans.map((plan) => (
                            <article
                                key={plan.name}
                                className={`relative rounded-[2rem] border bg-white p-6 shadow-sm ${
                                    plan.highlighted ? "border-indigo-300 shadow-xl shadow-indigo-100/70 ring-4 ring-indigo-50" : "border-slate-200"
                                }`}
                            >
                                {plan.badge && (
                                    <span className="absolute right-6 top-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">
                                        {plan.badge}
                                    </span>
                                )}
                                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">{plan.name}</p>
                                <h3 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                                    {plan.price}
                                    <span className="ml-1 text-base font-bold text-slate-500">{plan.period}</span>
                                </h3>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{plan.yearly}</p>
                                <p className="mt-4 text-sm font-bold text-slate-700">{plan.audience}</p>
                                <ul className="mt-6 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex gap-3 text-sm leading-6 text-slate-700">
                                            <Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    onClick={() => scrollToSection("registration")}
                                    className={`mt-7 inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black transition ${
                                        plan.highlighted
                                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                            : "border border-slate-200 text-slate-800 hover:bg-slate-50"
                                    }`}
                                >
                                    {plan.cta}
                                </button>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <SectionHeading
                        align="left"
                        eyebrow="How it works"
                        title="From first idea to active store in four focused steps"
                        text="The flow is intentionally simple: create the account, customize the storefront, add products, and begin selling."
                    />

                    <div className="grid gap-3 md:grid-cols-4">
                        {howItWorksSteps.map((stepItem) => (
                            <article key={stepItem.number} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm font-black text-indigo-600">{stepItem.number}</p>
                                <h3 className="mt-5 text-lg font-semibold text-slate-950">{stepItem.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{stepItem.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-slate-950 px-5 py-16 text-white sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 sm:p-7">
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                [LockKeyhole, "Secure launch", "OTP verification and admin account protection."],
                                [Users, "Customer ready", "Customer accounts and orders scoped to the right shop."],
                                [Mail, "Operational mail", "Order updates and communication workflows supported."],
                            ].map(([Icon, title, text]) => (
                                <div key={title} className="rounded-3xl bg-white/[0.06] p-5">
                                    <Icon size={24} className="text-cyan-200" />
                                    <p className="mt-5 font-bold text-white">{title}</p>
                                    <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <SectionHeading
                        align="left"
                        tone="dark"
                        eyebrow="Trust"
                        title="A serious first impression for serious store owners"
                        text="The page explains what sellers can do before asking for registration details, which improves confidence and reduces signup hesitation."
                    />
                </div>
            </section>

            <section id="registration" className="bg-[#f7f9fc] px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                    <div className="lg:sticky lg:top-8">
                        <SectionHeading
                            align="left"
                            eyebrow="Create your store"
                            title="Start with a few details"
                            text="The form stays short. Verify your email, launch the store, and continue setup from the dashboard."
                        />
                        <div className="mt-7 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-950">Setup progress</p>
                                <p className="text-sm font-black text-indigo-700">{setupProgress}%</p>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${setupProgress}%` }} />
                            </div>
                            <p className="mt-4 text-sm leading-6 text-slate-600">
                                {step === 1 ? "Start with a 14-day free trial. You can choose a plan after setup." : "Enter your code to create the store and open the storefront."}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/80 sm:p-8">
                        <div className="mb-8 flex items-center gap-3">
                            {[1, 2].map((item) => (
                                <div key={item} className="flex flex-1 items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${step >= item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-400"}`}>
                                        {item}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-sm font-bold text-slate-950">{item === 1 ? "Store details" : "Email verification"}</p>
                                        <p className="text-xs text-slate-500">{item === 1 ? "Tell us what to create" : "Confirm ownership"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {error && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
                        {success && <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}

                        {step === 1 ? (
                            <form onSubmit={handleSendOtp} className="space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <TextField
                                        label="Store name"
                                        name="shopName"
                                        value={formData.shopName}
                                        onChange={handleChange}
                                        placeholder="Elite Threads"
                                        helper="This appears on your storefront and admin."
                                        error={formData.shopName ? validation.shopName : ""}
                                        required
                                    />
                                    <TextField
                                        label="Owner name"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="Ishaq Khan"
                                        helper="Used for your admin account."
                                        error={formData.fullName ? validation.fullName : ""}
                                        required
                                    />
                                </div>

                                <TextField
                                    label="Store URL"
                                    name="subdomain"
                                    value={formData.subdomain}
                                    onChange={handleChange}
                                    placeholder="yourstore"
                                    suffix={`.${baseDomain}`}
                                    helper={`Your store will be available at yourstore.${baseDomain}`}
                                    error={formData.subdomain ? validation.subdomain : ""}
                                    required
                                />

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <TextField
                                        label="Email"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="name@domain.com"
                                        helper="We send the launch code here."
                                        error={formData.email ? validation.email : ""}
                                        required
                                    />
                                    <TextField
                                        label="Password"
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="At least 8 characters"
                                        helper="Use at least 8 characters."
                                        error={formData.password ? validation.password : ""}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sf-accent)] px-6 text-sm font-black text-white shadow-lg shadow-teal-200 transition hover:-translate-y-0.5 hover:bg-[var(--sf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isLoading ? <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Send verification code"}
                                    {!isLoading && <ArrowRight size={18} />}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleFinalRegister} className="space-y-7">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-sm font-bold text-slate-950">Check your email</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{formData.email}</span>.
                                    </p>
                                </div>

                                <TextField
                                    label="Verification code"
                                    name="otp"
                                    value={formData.otp}
                                    onChange={handleChange}
                                    placeholder="000000"
                                    inputMode="numeric"
                                    maxLength={6}
                                    helper="Enter the 6-digit code sent to your email."
                                    error={formData.otp ? validation.otp : ""}
                                    autoFocus
                                    required
                                />

                                <div className="space-y-3">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sf-accent)] px-6 text-sm font-black text-white shadow-lg shadow-teal-200 transition hover:-translate-y-0.5 hover:bg-[var(--sf-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isLoading ? <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Launch store"}
                                        {!isLoading && <ArrowRight size={18} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep(1);
                                            setError("");
                                            setSuccess("");
                                        }}
                                        className="h-12 w-full rounded-2xl text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                    >
                                        Edit store details
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </section>

            <section id="faq" className="px-5 py-16 sm:px-8 lg:px-10">
                <SectionHeading
                    eyebrow="FAQ"
                    title="Questions before you start?"
                    text="Answers store owners usually need before creating their first shop."
                />
                <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
                    {faqItems.map((item) => (
                        <article key={item.question} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-semibold text-slate-950">{item.question}</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
                        </article>
                    ))}
                </div>
            </section>

            <footer className="border-t border-slate-200 bg-slate-950 px-5 py-12 text-white sm:px-8 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
                        <div>
                            <a href="#top" className="inline-flex items-center gap-3" aria-label="Scaleup home">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                                    <Store size={22} />
                                </span>
                                <span className="text-lg font-semibold tracking-tight">Scaleup</span>
                            </a>
                            <p className="mt-4 max-w-sm text-sm leading-6 text-white/58">
                                A Bangladesh-friendly Shopify-style online store platform for sellers who want to launch and operate without coding.
                            </p>
                            <a href="mailto:support@scaleup.codes" className="mt-4 inline-flex text-sm font-bold text-cyan-200 hover:text-white">
                                support@scaleup.codes
                            </a>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {footerColumns.map((column) => (
                                <div key={column.title}>
                                    <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/38">{column.title}</h2>
                                    <div className="mt-4 grid gap-3">
                                        {column.links.map((link) => (
                                            <a key={`${column.title}-${link.label}`} href={link.href} className="text-sm font-semibold text-white/68 hover:text-white">
                                                {link.label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/42 sm:flex-row sm:items-center sm:justify-between">
                        <p>© {new Date().getFullYear()} Scaleup. All rights reserved.</p>
                        <p>Built for modern local commerce workflows.</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
