"use client";
import React, { memo, useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, Sparkles, Zap } from 'lucide-react';

const normalizeFeatures = (features) => (
    Array.isArray(features)
        ? features
            .map(feature => {
                if (typeof feature === 'string') {
                    const reason = feature.trim();
                    return reason ? { point: 'Product benefit', reason } : null;
                }

                const point = String(feature?.point || feature?.title || feature?.label || feature?.name || '').trim();
                const reason = String(feature?.reason || feature?.value || feature?.description || feature?.text || '').trim();
                return point && reason ? { point, reason } : null;
            })
            .filter(Boolean)
        : []
);

export const ProductFeatures = memo(function ProductFeatures({ features }) {
    const normalizedFeatures = normalizeFeatures(features);

    if (!normalizedFeatures.length) return null;

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
                {normalizedFeatures.map((feature, idx) => (
                    <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                        <h4 className="mb-2 text-base font-black text-slate-950">{feature.point}</h4>
                        <p className="text-sm leading-6 text-slate-600">{feature.reason}</p>
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
                        Extra notes
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

const EmptyTabState = ({ label }) => (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
        <p className="text-sm font-bold text-slate-500">{label} have not been added for this product yet.</p>
    </div>
);

export const ProductInformationTabs = memo(function ProductInformationTabs({
    features,
    specifications,
    comments,
}) {
    const [activeTab, setActiveTab] = useState('details');
    const normalizedFeatures = useMemo(() => normalizeFeatures(features), [features]);
    const normalizedSpecifications = Array.isArray(specifications)
        ? specifications.filter(spec => spec?.title && spec?.value)
        : [];
    const normalizedComments = Array.isArray(comments)
        ? comments.filter(comment => comment?.title && comment?.value)
        : [];
    const tabs = [
        { id: 'highlights', label: 'Highlights', icon: Sparkles },
        { id: 'details', label: 'Details', icon: ClipboardList },
        { id: 'buying-guide', label: 'Buying guide', icon: Zap },
    ];

    const handleTabKeyDown = (event, index) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        const nextTab = tabs[nextIndex];
        setActiveTab(nextTab.id);
        document.getElementById(`product-info-tab-${nextTab.id}`)?.focus();
    };

    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            <div
                role="tablist"
                aria-label="Product information"
                className="grid grid-cols-3 border-b border-slate-200 bg-slate-50"
            >
                {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const selected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            id={`product-info-tab-${tab.id}`}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-controls={`product-info-panel-${tab.id}`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => setActiveTab(tab.id)}
                            onKeyDown={event => handleTabKeyDown(event, index)}
                            className={`flex min-h-14 min-w-0 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-black transition sm:gap-2 sm:px-4 sm:text-sm ${
                                selected
                                    ? 'border-[var(--sf-accent)] bg-white text-[var(--sf-accent)]'
                                    : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-900'
                            }`}
                        >
                            <Icon size={16} className="shrink-0" />
                            <span className="min-w-0 leading-4">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div
                id={`product-info-panel-${activeTab}`}
                role="tabpanel"
                aria-labelledby={`product-info-tab-${activeTab}`}
                className="p-4 sm:p-6"
            >
                {activeTab === 'details' && (
                    normalizedSpecifications.length ? (
                        <dl className="overflow-hidden rounded-lg border border-slate-200">
                            {normalizedSpecifications.map((spec, index) => (
                                <div key={`${spec.title}-${index}`} className="grid gap-1 border-b border-slate-200 px-4 py-4 last:border-0 sm:grid-cols-[minmax(130px,0.35fr)_1fr] sm:gap-5">
                                    <dt className="text-xs font-black uppercase tracking-wider text-slate-500">{spec.title}</dt>
                                    <dd className="text-sm font-bold text-slate-950">{spec.value}</dd>
                                </div>
                            ))}
                        </dl>
                    ) : <EmptyTabState label="Product details" />
                )}

                {activeTab === 'highlights' && (
                    normalizedFeatures.length ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {normalizedFeatures.map((feature, index) => (
                                <div key={`${feature.point}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-sm font-black text-slate-950">{feature.point}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.reason}</p>
                                </div>
                            ))}
                        </div>
                    ) : <EmptyTabState label="Product highlights" />
                )}

                {activeTab === 'buying-guide' && (
                    normalizedComments.length ? (
                        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
                            {normalizedComments.map((comment, index) => (
                                <details key={`${comment.title}-${index}`} className="group px-4 py-4" open={index === 0}>
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-950">
                                        <span>{comment.title}</span>
                                        <ChevronDown size={17} className="shrink-0 text-[var(--sf-accent)] transition group-open:rotate-180" />
                                    </summary>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">{comment.value}</p>
                                </details>
                            ))}
                        </div>
                    ) : <EmptyTabState label="Buying guide notes" />
                )}
            </div>
        </section>
    );
});
