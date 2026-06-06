"use client";

import { useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    Box,
    Check,
    ChevronRight,
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

const featureCards = [
    { icon: Store, title: "Multi-vendor ready", text: "Launch one store now and grow into a complete seller platform." },
    { icon: Package, title: "Inventory control", text: "Track products, variants, stock, and low-stock signals in one place." },
    { icon: Truck, title: "Order tracking", text: "Keep customers informed from checkout to delivery." },
    { icon: Palette, title: "Theme builder", text: "Customize colors, banners, layout, checkout branding, and policies." },
    { icon: ShoppingBag, title: "Mobile commerce", text: "Stores are designed for fast browsing and checkout on phones." },
    { icon: BarChart3, title: "Analytics dashboard", text: "Understand revenue, products, customers, and store performance." },
    { icon: CreditCard, title: "Selling tools", text: "Promotions, coupons, checkout, and customer workflows are built in." },
    { icon: ShieldCheck, title: "Secure foundation", text: "Tenant-aware architecture keeps each shop's data separated." },
];

const benefitCards = [
    "No-code storefront setup",
    "Admin dashboard for daily operations",
    "Theme controls built for non-technical owners",
    "Customer accounts scoped per shop",
];

const faqItems = [
    {
        question: "Do I need technical experience?",
        answer: "No. The store builder, product tools, and order dashboard are designed for store owners, not developers.",
    },
    {
        question: "Can I use my own domain?",
        answer: "Yes. Start with a subdomain today and connect a custom domain when you are ready.",
    },
    {
        question: "Will my store work on mobile?",
        answer: "Yes. The storefront and checkout are responsive so customers can browse and buy from any device.",
    },
    {
        question: "What happens after I register?",
        answer: "You verify your email, your store is created, and you are redirected to your live storefront.",
    },
];

const previewProducts = [
    { name: "Signature Hoodie", price: "$48", tag: "New" },
    { name: "Studio Backpack", price: "$72", tag: "Best" },
    { name: "Daily Sneakers", price: "$89", tag: "Fast ship" },
];

function SectionHeading({ eyebrow, title, text, align = "center" }) {
    return (
        <div className={`mx-auto max-w-3xl ${align === "center" ? "text-center" : "text-left"}`}>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-indigo-600">{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{text}</p>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, text }) {
    return (
        <article className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/60">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                <Icon size={22} strokeWidth={2.2} />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </article>
    );
}

function TextField({ label, helper, error, suffix, ...props }) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <span className="relative mt-2 block">
                <input
                    {...props}
                    className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 ${
                        suffix ? "pr-32" : ""
                    } ${error ? "border-red-300" : "border-slate-200"}`}
                />
                {suffix && (
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400">
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

function StorePreviewScene() {
    return (
        <div className="landing-float relative mx-auto w-full max-w-5xl">
            <div className="absolute left-2 top-10 hidden rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur md:block">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Zap size={19} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Today</p>
                        <p className="text-sm font-semibold text-slate-900">36 orders</p>
                    </div>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/15">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-950 px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-400" />
                        <span className="h-3 w-3 rounded-full bg-amber-300" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 sm:flex">
                        <Globe2 size={13} />
                        yourstore.scaleup.codes
                    </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-[0.72fr_1fr]">
                    <div className="bg-slate-950 p-6 text-white sm:p-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                                <Store size={21} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Scaleup Admin</p>
                                <p className="text-xs text-white/50">Live store command center</p>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-3">
                            {[
                                ["Revenue", "$12.8k"],
                                ["Conversion", "4.8%"],
                                ["AOV", "$58"],
                                ["Stock alerts", "7"],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                                    <p className="text-xs text-white/50">{label}</p>
                                    <p className="mt-2 text-xl font-semibold">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm font-semibold">Launch checklist</p>
                                <p className="text-xs text-emerald-300">83%</p>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full w-5/6 rounded-full bg-emerald-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#f8fafc] p-5 sm:p-8">
                        <div className="rounded-3xl bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">New season</p>
                                    <h3 className="mt-2 text-2xl font-semibold text-slate-950">Modern storefront</h3>
                                </div>
                                <button type="button" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                                    Shop
                                </button>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                {previewProducts.map((product) => (
                                    <div key={product.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 via-white to-emerald-100 text-indigo-700">
                                            <Box size={26} />
                                        </div>
                                        <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">{product.tag}</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-950">{product.name}</p>
                                        <p className="mt-2 text-sm font-bold text-indigo-700">{product.price}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
        <main id="top" className="min-h-screen bg-white text-slate-950">
            <section className="relative isolate overflow-hidden bg-slate-950 text-white">
                <div className="absolute inset-0 -z-10 landing-grid opacity-40" />
                <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
                    <nav className="flex items-center justify-between">
                        <a href="#top" className="flex items-center gap-3" aria-label="Scaleup home">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                                <Store size={22} />
                            </span>
                            <span className="text-lg font-semibold tracking-tight">Scaleup</span>
                        </a>
                        <button
                            type="button"
                            onClick={scrollToRegistration}
                            className="hidden rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-slate-950 sm:inline-flex"
                        >
                            Create Store
                        </button>
                    </nav>

                    <div className="relative flex flex-1 items-center py-16 sm:py-20 lg:py-24">
                        <div className="mx-auto max-w-4xl text-center">
                            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
                                <Sparkles size={16} className="text-emerald-300" />
                                Built for modern online sellers
                            </div>
                            <h1 className="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                                Launch your online store in minutes
                            </h1>
                            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-xl">
                                Create a professional storefront, manage products and orders, customize your brand, and start selling without writing code.
                            </p>
                            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={scrollToRegistration}
                                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-extrabold text-slate-950 shadow-2xl shadow-white/10 transition hover:-translate-y-0.5 hover:bg-indigo-50 sm:w-auto"
                                >
                                    Create Store
                                    <ArrowRight size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={scrollToPreview}
                                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 text-sm font-extrabold text-white transition hover:bg-white/15 sm:w-auto"
                                >
                                    <Play size={17} />
                                    Watch Demo
                                </button>
                            </div>
                        </div>

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 mx-auto max-w-6xl translate-y-1/2 px-8 opacity-35 blur-[1px] lg:opacity-45">
                            <StorePreviewScene />
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white px-5 pb-20 pt-36 sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {benefitCards.map((benefit) => (
                        <div key={benefit} className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <Check size={15} strokeWidth={3} />
                            </span>
                            <p className="text-sm font-semibold leading-6 text-slate-800">{benefit}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="px-5 py-20 sm:px-8 lg:px-10">
                <SectionHeading
                    eyebrow="Platform benefits"
                    title="Everything a new store owner needs to feel confident"
                    text="The platform gives sellers a simple control room for storefront design, products, orders, customers, marketing, and analytics."
                />
                <div className="mx-auto mt-12 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {featureCards.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </div>
            </section>

            <section id="store-preview" className="bg-slate-50 px-5 py-20 sm:px-8 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <SectionHeading
                        eyebrow="Store preview"
                        title="Show customers a polished store from day one"
                        text="Your dashboard, storefront, and mobile shopping experience work together so customers can discover products and check out quickly."
                    />
                    <div className="mt-12">
                        <StorePreviewScene />
                    </div>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {[
                            ["Desktop", "A premium storefront layout for product discovery and brand storytelling."],
                            ["Tablet", "Balanced grids and touch-friendly controls for relaxed browsing."],
                            ["Mobile", "Fast product cards, clear checkout steps, and easy account access."],
                        ].map(([title, text]) => (
                            <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm font-bold text-slate-950">{title}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-5 py-20 sm:px-8 lg:px-10">
                <div className="mx-auto max-w-7xl">
                    <SectionHeading
                        eyebrow="How it works"
                        title="From idea to live store in four clear steps"
                        text="Start with the essentials, then keep improving your store as your business grows."
                    />
                    <div className="mt-12 grid gap-5 lg:grid-cols-4">
                        {[
                            ["01", "Create account", "Add your store name, owner details, and secure login."],
                            ["02", "Customize store", "Upload branding and tune colors, banners, sections, and checkout."],
                            ["03", "Add products", "Create products, manage stock, and prepare your catalog."],
                            ["04", "Start selling", "Share your store URL and manage orders from the dashboard."],
                        ].map(([number, title, text]) => (
                            <article key={number} className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-sm font-black text-indigo-600">{number}</p>
                                <h3 className="mt-5 text-xl font-semibold text-slate-950">{title}</h3>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                                <ChevronRight className="absolute right-5 top-6 hidden text-slate-300 lg:block" size={20} />
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-slate-950 px-5 py-20 text-white sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-300">Trust foundation</p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Built for serious sellers, even on day one</h2>
                        <p className="mt-4 text-base leading-7 text-white/65">
                            Every shop gets a separate storefront space, secure admin access, and operational tools that make the business feel organized from the first order.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            [LockKeyhole, "Secure login", "OTP verification before launch."],
                            [Users, "Customer ready", "Accounts and orders built for repeat buyers."],
                            [Mail, "Operational email", "Order updates and customer messages supported."],
                        ].map(([Icon, title, text]) => (
                            <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                                <Icon size={24} className="text-emerald-300" />
                                <p className="mt-5 font-semibold">{title}</p>
                                <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="registration" className="bg-slate-50 px-5 py-20 sm:px-8 lg:px-10">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <div className="lg:sticky lg:top-8">
                        <SectionHeading
                            align="left"
                            eyebrow="Create your store"
                            title="Start with a few details"
                            text="The form is short. Verify your email, launch the store, and continue setup from your dashboard."
                        />
                        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-950">Setup progress</p>
                                <p className="text-sm font-bold text-indigo-700">{setupProgress}%</p>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${setupProgress}%` }} />
                            </div>
                            <p className="mt-4 text-sm leading-6 text-slate-600">
                                {step === 1 ? "Complete the required fields to receive your verification code." : "Enter your code to create the store and open the storefront."}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-8">
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
                                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-extrabold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                                        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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

            <section className="px-5 py-20 sm:px-8 lg:px-10">
                <SectionHeading
                    eyebrow="FAQ"
                    title="Questions before you start?"
                    text="Here are the answers store owners usually need before creating their first shop."
                />
                <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
                    {faqItems.map((item) => (
                        <article key={item.question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-semibold text-slate-950">{item.question}</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
