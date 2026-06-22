"use client";
import React, { memo } from 'react';
import { ChevronDown, ClipboardList, Sparkles, Zap } from 'lucide-react';

export const ProductFeatures = memo(function ProductFeatures({ features }) {
    if (!features?.length) return null;

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]">
                    <Sparkles size={22} />
                </span>
                <div>
                    <p className="sf-kicker">Highlights</p>
                    <h2 className="text-2xl font-black text-slate-950">Why you&apos;ll love it</h2>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {features.map((feature, idx) => (
                    <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                        <h4 className="mb-2 text-base font-black text-slate-950">{feature.title}</h4>
                        <p className="text-sm leading-6 text-slate-600">{feature.value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
});

export const ProductSpecifications = memo(function ProductSpecifications({ specifications }) {
    if (!specifications?.length) return null;

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]">
                    <ClipboardList size={22} />
                </span>
                <div>
                    <p className="sf-kicker">Details</p>
                    <h2 className="text-2xl font-black text-slate-950">Specifications</h2>
                </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {specifications.map((spec, idx) => (
                    <div
                        key={idx}
                        className="flex flex-col border-b border-slate-200/70 bg-white px-4 py-4 transition-colors last:border-0 hover:bg-slate-50 sm:flex-row sm:px-5"
                    >
                        <dt className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500 sm:mb-0 sm:w-1/3">
                            {spec.title}
                        </dt>
                        <dd className="text-sm font-bold text-slate-950 sm:w-2/3">
                            {spec.value}
                        </dd>
                    </div>
                ))}
            </div>
        </section>
    );
});

export const ExpertNotes = memo(function ExpertNotes({ comments }) {
    if (!comments?.length) return null;

    return (
        <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-900/20">
                <div className="border-b border-white/10 p-5 sm:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Buying guide</p>
                    <h3 className="mt-2 flex items-center text-xl font-black text-white">
                        <Zap size={22} className="mr-3 fill-current text-yellow-400" />
                        Expert Notes
                    </h3>
                </div>
                <div className="divide-y divide-white/10">
                    {comments.map((comment, idx) => (
                        <details key={idx} className="group p-5 open:bg-white/[0.03] sm:p-6" open={idx === 0}>
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black uppercase tracking-wider text-cyan-200">
                                <span>{comment.title}</span>
                                <ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" />
                            </summary>
                            <p className="mt-3 text-sm leading-6 text-white/70">{comment.value}</p>
                        </details>
                    ))}
                </div>
            </div>
        </aside>
    );
});
