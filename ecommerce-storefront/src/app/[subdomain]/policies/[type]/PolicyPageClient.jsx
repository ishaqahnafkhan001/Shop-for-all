"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useStorefrontTheme } from "@/components/storefront/StorefrontThemeProvider";

const POLICY_LABELS = {
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    refund: "Return & Refund Policy",
    shipping: "Shipping Policy"
};

export default function PolicyPageClient({ type }) {
    const { theme } = useStorefrontTheme();
    const label = POLICY_LABELS[type] || "Store Policy";
    const content = theme?.policies?.[type] || "";

    return (
        <div className="sf-page">
            <section className="sf-shell py-10 sm:py-14">
                <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                    <div className="mb-7 flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]">
                            <FileText size={22} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Store policy</p>
                            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">{label}</h1>
                        </div>
                    </div>

                    {content ? (
                        <article className="prose prose-slate max-w-none whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
                            {content}
                        </article>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                            This policy has not been configured by the store yet.
                        </div>
                    )}

                    <Link href="/" className="sf-btn sf-btn-secondary mt-8 inline-flex">
                        Back to store
                    </Link>
                </div>
            </section>
        </div>
    );
}

