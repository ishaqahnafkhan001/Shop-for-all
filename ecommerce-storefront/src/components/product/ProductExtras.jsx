"use client";
import React, { memo } from 'react';
import { Zap, Tag } from 'lucide-react';

export const ProductFeatures = memo(function ProductFeatures({ features }) {
    if (!features?.length) return null;

    return (
        <section>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-10 flex items-center">
                <Zap className="mr-4 text-[var(--sf-accent)]" size={28} />
	                Why You&apos;ll Love It
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {features.map((feature, idx) => (
                    <div
                        key={idx}
                        className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow"
                    >
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h4>
                        <p className="text-gray-600 leading-relaxed">{feature.value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
});

export const ProductSpecifications = memo(function ProductSpecifications({ specifications }) {
    if (!specifications?.length) return null;

    return (
        <section>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-10 flex items-center">
                <Tag className="mr-4 text-[var(--sf-accent)]" size={28} />
                Tech Specs
            </h2>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                {specifications.map((spec, idx) => (
                    <div
                        key={idx}
                        className="flex flex-col sm:flex-row px-8 py-5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                        <dt className="text-sm font-bold text-gray-500 sm:w-1/3 uppercase tracking-widest mb-1 sm:mb-0">
                            {spec.title}
                        </dt>
                        <dd className="text-base font-medium text-gray-900 sm:w-2/3">
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
        <div className="lg:w-[380px] shrink-0">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sticky top-8 shadow-2xl shadow-gray-900/20">
                <h3 className="text-xl font-bold text-white mb-8 flex items-center border-b border-white/10 pb-4">
                    <Zap size={22} className="mr-3 text-yellow-400 fill-current" />
                    Expert Notes
                </h3>
                <div className="space-y-6">
                    {comments.map((comment, idx) => (
                        <div key={idx} className="group">
                            <strong className="flex items-center text-[var(--sf-accent-light,cyan-400)] font-bold mb-2 text-sm uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
                                {comment.title}
                            </strong>
                            <span className="text-gray-300 text-sm leading-relaxed block pl-3.5 border-l border-white/10 ml-[3px]">
                                {comment.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
