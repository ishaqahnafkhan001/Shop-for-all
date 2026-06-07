"use client";

import { useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    Box,
    Check,
    CreditCard,
    Globe2,
    LockKeyhole,
    Mail,
    Package,
    Palette,
    Play,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Store,
    Truck,
    Users,
    Zap,
} from "lucide-react";
import API from "../api/api";

const businessOutcomes = [
    "Launch a professional storefront without code",
    "Manage products, orders, customers, and themes in one operating system",
    "Start on a subdomain and connect your own brand domain later",
    "Build on tenant-aware architecture as your seller network grows",
];

const platformModules = [
    {
        icon: Palette,
        title: "Brand studio",
        text: "Theme colors, typography, homepage sections, banners, checkout branding, and policies stay editable without touching code.",
        metrics: ["Live preview", "Mobile ready", "No code"],
    },
    {
        icon: Package,
        title: "Catalog command",
        text: "Products, variants, collections, stock alerts, SKU data, and inventory controls are structured for real selling operations.",
        metrics: ["Variants", "Inventory", "Bulk tools"],
    },
    {
        icon: Truck,
        title: "Order operations",
        text: "Orders, tracking, customer updates, status email, and delivery workflows are designed to keep the store moving.",
        metrics: ["Tracking", "Email", "Fulfillment"],
    },
    {
        icon: BarChart3,
        title: "Growth insights",
        text: "Vendor dashboards surface revenue, best sellers, returning customers, conversion signals, and inventory health.",
        metrics: ["Revenue", "AOV", "Reports"],
    },
];

const featureRail = [
    { icon: Store, title: "Multi-store foundation", text: "Built for one shop today and a larger seller platform tomorrow." },
    { icon: ShoppingBag, title: "Conversion storefronts", text: "Fast product discovery, clean product pages, and mobile-first checkout." },
    { icon: CreditCard, title: "Promotion ready", text: "Coupons, discounts, free shipping, and campaign workflows can grow with you." },
    { icon: ShieldCheck, title: "Tenant-aware access", text: "Vendor, staff, and customer roles stay scoped to the right shop." },
];

const trustSignals = [
    ["Minutes", "to create the first storefront"],
    ["Mobile first", "from homepage to checkout"],
    ["No code", "for core store customization"],
    ["Tenant scoped", "for safer SaaS growth"],
];

const previewProducts = [
    { name: "Studio Sneaker", price: "$89", status: "Fast ship", color: "from-indigo-200 via-white to-emerald-100" },
    { name: "Everyday Pack", price: "$72", status: "Best seller", color: "from-sky-200 via-white to-indigo-100" },
    { name: "Signature Tee", price: "$34", status: "New drop", color: "from-emerald-200 via-white to-slate-100" },
];

const faqItems = [
    {
        question: "Do I need technical experience?",
        answer: "No. The page, theme, product, and order tools are designed for business owners who want to move quickly without code.",
    },
    {
        question: "Can I use my own domain?",
        answer: "Yes. You can start with a store subdomain and connect a custom domain when your brand is ready.",
    },
    {
        question: "Will my store work well on mobile?",
        answer: "Yes. The storefront experience is mobile-first, with responsive layouts for product discovery and checkout.",
    },
    {
        question: "What happens after registration?",
        answer: "You verify your email, the platform creates your store, and you are redirected to the live storefront.",
    },
];

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
                        suffix ? "pr-40 sm:pr-48" : ""
                    } ${error ? "border-red-300" : "border-slate-200"}`}
                />
                {suffix && (
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex max-w-[42%] items-center truncate text-xs font-bold text-slate-400">
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

function MiniProductCard({ product }) {
    return (
        <div className="rounded-2xl border border-white/70 bg-white p-3 shadow-xl shadow-slate-950/10">
            <div className={`flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br ${product.color} text-indigo-700`}>
                <Box size={26} />
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{product.status}</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{product.name}</p>
            <p className="mt-1 text-sm font-black text-indigo-700">{product.price}</p>
        </div>
    );
}

function CommerceSystemVisual({ compact = false }) {
    return (
        <div className={`landing-perspective relative mx-auto w-full ${compact ? "max-w-5xl" : "max-w-6xl"}`} aria-hidden="true">
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
                                    <p className="text-xs text-white/45">Commerce operating system</p>
                                </div>
                            </div>
                            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200 sm:flex">
                                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                                Live
                            </div>
                        </div>

                        <div className="grid gap-3 pt-4 lg:grid-cols-[0.72fr_1fr]">
                            <div className="space-y-3">
                                {[
                                    ["Revenue", "$18,420", "+22.4%"],
                                    ["Orders", "316", "+14.8%"],
                                    ["Conversion", "5.2%", "+1.1%"],
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
                                        <p className="text-xs font-bold uppercase tracking-widest text-cyan-100/70">Launch score</p>
                                        <p className="text-xs font-black text-cyan-100">92%</p>
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
                                        <h3 className="mt-1 text-2xl font-semibold tracking-tight">New collection</h3>
                                    </div>
                                    <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                                        Shop
                                    </div>
                                </div>
                                <div className="mt-5 grid grid-cols-3 gap-3">
                                    {previewProducts.map((product) => (
                                        <MiniProductCard key={product.name} product={product} />
                                    ))}
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-bold text-slate-400">Theme status</p>
                                        <p className="mt-2 text-sm font-black text-slate-950">Brand ready</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-bold text-slate-400">Inventory</p>
                                        <p className="mt-2 text-sm font-black text-slate-950">1,284 units</p>
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
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Today</p>
                            <p className="text-lg font-black">$2.6k sales</p>
                        </div>
                    </div>
                </div>

                <div className="landing-float-delay absolute -bottom-6 left-6 hidden w-56 rounded-3xl border border-white/70 bg-white/90 p-4 text-slate-950 shadow-2xl shadow-slate-950/20 backdrop-blur sm:block">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Orders</p>
                            <p className="mt-1 text-xl font-black">Ready to ship</p>
                        </div>
                        <Truck className="text-indigo-700" size={24} />
                    </div>
                    <div className="mt-4 flex gap-1">
                        {[70, 46, 88, 58, 76, 54].map((height, index) => (
                            <span
                                key={index}
                                className="w-full rounded-full bg-indigo-200"
                                style={{ height: `${height}px` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureRailCard({ icon: Icon, title, text }) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon size={22} className="text-indigo-700" />
            <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </article>
    );
}

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

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000";

    const validation = useMemo(() => {
        const emailValid = /^\S+@\S+\.\S+$/.test(formData.email.trim());
        const subdomainValid = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(formData.subdomain.trim().toLowerCase());

        return {
            shopName: formData.shopName.trim().length < 2 ? "Use at least 2 characters for your store name." : "",
            fullName: formData.fullName.trim().length < 2 ? "Enter the owner name customers and staff can recognize." : "",
            subdomain: !formData.subdomain.trim()
                ? "Choose a short store URL."
                : subdomainValid
                    ? ""
                    : "Use 3-63 lowercase letters, numbers, or hyphens. Start and end with a letter or number.",
            email: !formData.email.trim() ? "We will send your verification code here." : emailValid ? "" : "Enter a valid email address.",
            password: formData.password.length < 8 ? "Use at least 8 characters." : "",
            otp: formData.otp.trim().length !== 6 ? "Enter the 6-digit code from your email." : "",
        };
    }, [formData]);

    const completedFields = ["shopName", "subdomain", "fullName", "email", "password"].filter((field) => !validation[field]).length;
    const setupProgress = Math.round((completedFields / 5) * 100);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nextValue = name === "subdomain" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value;
        setFormData((prev) => ({ ...prev, [name]: nextValue }));
        setError("");
        setSuccess("");
    };

    const scrollToRegistration = () => {
        document.getElementById("registration")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const scrollToPreview = () => {
        document.getElementById("store-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
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
            setError(err.response?.data?.error || "Failed to send code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalRegister = async (e) => {
        e.preventDefault();
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
            setError(err.response?.data?.error || "Registration failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main id="top" className="landing-shell min-h-screen bg-white text-slate-950">
            <section className="landing-hero relative isolate overflow-hidden text-white">
                <div className="absolute inset-0 -z-10 landing-grid opacity-45" />
                <div className="mx-auto flex min-h-[calc(100svh-24px)] w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
                    <nav className="flex items-center justify-between">
                        <a href="#top" className="flex items-center gap-3" aria-label="Scaleup home">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-2xl shadow-white/10">
                                <Store size={22} />
                            </span>
                            <span className="text-lg font-semibold tracking-tight">Scaleup</span>
                        </a>
                        <div className="hidden items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/70 backdrop-blur sm:flex">
                            <ShieldCheck size={15} className="text-emerald-300" />
                            Tenant-aware commerce SaaS
                        </div>
                        <button
                            type="button"
                            onClick={scrollToRegistration}
                            className="hidden rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:bg-white hover:text-slate-950 md:inline-flex"
                        >
                            Create Store
                        </button>
                    </nav>

                    <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
                        <div className="relative z-10 max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/78 backdrop-blur">
                                <Sparkles size={16} className="text-cyan-200" />
                                A premium launch system for online sellers
                            </div>

                            <h1 className="mt-7 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                                Build, manage, and grow your store from one place
                            </h1>
                            <p className="mt-6 max-w-xl text-base leading-8 text-white/68 sm:text-lg">
                                Scaleup gives entrepreneurs a professional storefront, theme builder, inventory controls, order workflows, and analytics without the complexity of custom development.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={scrollToRegistration}
                                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-slate-950 shadow-2xl shadow-cyan-200/10 transition hover:-translate-y-0.5 hover:bg-cyan-50"
                                >
                                    Create Store
                                    <ArrowRight size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={scrollToPreview}
                                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-7 text-sm font-black text-white backdrop-blur transition hover:bg-white/[0.14]"
                                >
                                    <Play size={17} />
                                    Watch Demo
                                </button>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {trustSignals.map(([value, label]) => (
                                    <div key={value} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                                        <p className="text-lg font-black text-white">{value}</p>
                                        <p className="mt-1 text-xs leading-5 text-white/48">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative z-10 lg:-mr-10">
                            <CommerceSystemVisual />
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y border-slate-200 bg-white px-5 py-6 sm:px-8 lg:px-10">
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

            <section className="bg-[#f7f9fc] px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                    <SectionHeading
                        align="left"
                        eyebrow="Platform system"
                        title="A business operating system, not just a registration form"
                        text="The experience is designed to help a seller understand the product quickly, trust the platform, and see how the store will operate after signup."
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        {platformModules.map((module) => {
                            const Icon = module.icon;
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

            <section id="store-preview" className="px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
                        <div>
                            <SectionHeading
                                align="left"
                                eyebrow="Store preview"
                                title="Let sellers picture the business they are about to launch"
                                text="Premium visuals show the dashboard, storefront, inventory, orders, and checkout as one connected commerce workflow."
                            />
                            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                {featureRail.map((feature) => (
                                    <FeatureRailCard key={feature.title} {...feature} />
                                ))}
                            </div>
                        </div>
                        <CommerceSystemVisual compact />
                    </div>
                </div>
            </section>

            <section className="bg-slate-950 px-5 py-16 text-white sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <SectionHeading
                        align="left"
                        tone="dark"
                        eyebrow="How it works"
                        title="From first idea to active store in four focused steps"
                        text="The flow is intentionally simple: create the account, customize the storefront, add products, and begin selling."
                    />

                    <div className="grid gap-3 md:grid-cols-4">
                        {[
                            ["01", "Create", "Store name, URL, owner account, and email verification."],
                            ["02", "Brand", "Logo, color system, homepage sections, banners, and checkout."],
                            ["03", "Catalog", "Products, variants, collections, stock, prices, and images."],
                            ["04", "Sell", "Orders, tracking, email updates, analytics, and operations."],
                        ].map(([number, title, text]) => (
                            <article key={number} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                                <p className="text-sm font-black text-cyan-200">{number}</p>
                                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-white/58">{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-5 py-16 sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-7">
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                [LockKeyhole, "Secure launch", "OTP verification and admin account protection."],
                                [Users, "Customer ready", "Customer accounts and orders scoped to the right shop."],
                                [Mail, "Operational mail", "Order updates and communication workflows supported."],
                            ].map(([Icon, title, text]) => (
                                <div key={title} className="rounded-3xl bg-slate-50 p-5">
                                    <Icon size={24} className="text-indigo-700" />
                                    <p className="mt-5 font-bold text-slate-950">{title}</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <SectionHeading
                        align="left"
                        eyebrow="Trust"
                        title="A serious first impression for serious store owners"
                        text="The page now makes the platform feel credible before asking for registration details, which improves confidence and reduces signup hesitation."
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
                                {step === 1 ? "Complete each required field to receive your verification code." : "Enter your code to create the store and open the storefront."}
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
                                    placeholder="mystore"
                                    suffix={`.${baseDomain}`}
                                    helper="Use a short, memorable URL. You can connect a custom domain later."
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
                                        helper="Use a strong password for your admin."
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
                                    helper="The code expires soon, so complete this step now."
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

            <section className="px-5 py-16 sm:px-8 lg:px-10">
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
        </main>
    );
}
