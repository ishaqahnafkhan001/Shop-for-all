"use client";
import React, { memo } from 'react';
import { Zap, Tag } from 'lucide-react';

export const ProductFeatures = memo(function ProductFeatures({ features }) {
    if (!features?.length) return null;

    return (
        <section className="sf-panel p-5 sm:p-6">
            <h2 className="mb-5 flex items-center text-2xl font-black text-slate-950">
                <Zap className="mr-3 text-[var(--sf-accent)]" size={24} />
	                Why You&apos;ll Love It
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {features.map((feature, idx) => (
                    <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
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
        <section className="sf-panel overflow-hidden p-5 sm:p-6">
            <h2 className="mb-5 flex items-center text-2xl font-black text-slate-950">
                <Tag className="mr-3 text-[var(--sf-accent)]" size={24} />
                Tech Specs
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {specifications.map((spec, idx) => (
                    <div
                        key={idx}
                        className="flex flex-col border-b border-slate-100 px-5 py-4 transition-colors last:border-0 hover:bg-slate-50 sm:flex-row"
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
        <div>
            <div className="sticky top-24 rounded-3xl bg-slate-950 p-6 shadow-2xl shadow-slate-900/20">
                <h3 className="mb-6 flex items-center border-b border-white/10 pb-4 text-xl font-black text-white">
                    <Zap size={22} className="mr-3 text-yellow-400 fill-current" />
                    Expert Notes
                </h3>
                <div className="space-y-5">
                    {comments.map((comment, idx) => (
                        <div key={idx} className="group">
                            <strong className="mb-2 flex items-center text-sm font-black uppercase tracking-wider text-cyan-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
                                {comment.title}
                            </strong>
                            <span className="ml-[3px] block border-l border-white/10 pl-3.5 text-sm leading-6 text-white/62">
                                {comment.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
