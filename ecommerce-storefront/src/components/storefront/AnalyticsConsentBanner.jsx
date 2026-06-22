"use client";

import { useEffect, useState } from "react";
import {
    getAnalyticsConsent,
    setAnalyticsConsent
} from "@/utils/analyticsTracker";

export default function AnalyticsConsentBanner() {
    const [choice, setChoice] = useState(() => getAnalyticsConsent());

    useEffect(() => {
        const syncChoice = () => setChoice(getAnalyticsConsent());
        window.addEventListener("scaleup-analytics-consent-changed", syncChoice);
        return () => window.removeEventListener("scaleup-analytics-consent-changed", syncChoice);
    }, []);

    if (choice !== "unknown") return null;

    const choose = (value) => {
        setAnalyticsConsent(value);
        setChoice(value);
    };

    return (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur sm:bottom-5 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">Help improve this store</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                        We use privacy-friendly analytics to understand product interest and improve the shopping experience.
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={() => choose("declined")}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
                    >
                        Decline
                    </button>
                    <button
                        type="button"
                        onClick={() => choose("accepted")}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 sm:text-sm"
                    >
                        Allow analytics
                    </button>
                </div>
            </div>
        </div>
    );
}
