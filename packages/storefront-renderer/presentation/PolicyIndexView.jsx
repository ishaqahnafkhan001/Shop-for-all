
import { FileText, ShieldCheck } from 'lucide-react';
import { Link } from './Runtime.jsx';




import { POLICY_LABELS, POLICY_TYPES, getPolicyContent } from './policyData.js';


export function PolicyIndexView({ adaptiveParts = false, atelier, policies, storeName }) { return (<div className={atelier ? "sf-page atelier-policy-index" : "sf-page"}>
            <section className="sf-shell py-10 sm:py-14">
                <div className={atelier ? "mx-auto" : "mx-auto max-w-5xl"}>
                    <div data-ab-surface={adaptiveParts ? '' : undefined} data-atelier-part={atelier ? "policy-layout" : undefined} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                        <div data-atelier-part={atelier ? "policy-heading" : undefined} className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sf-accent)]">Store policies</p>
                                <h1 data-ab-part={adaptiveParts ? 'heading' : undefined} className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                    Policies for {storeName}
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                                    Review refund, shipping, privacy, and terms information before placing an order.
                                </p>
                            </div>
                            <span data-ab-surface={adaptiveParts ? '' : undefined} className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                                <ShieldCheck size={15} />
                                Customer information
                            </span>
                        </div>

                        <div data-atelier-part={atelier ? "policy-contents" : undefined} role={atelier ? "navigation" : undefined} aria-label={(atelier || adaptiveParts) ? "Policy contents" : undefined} className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {POLICY_TYPES.map(type => (
                                <a data-ab-part={adaptiveParts ? 'links' : undefined} data-ab-surface={adaptiveParts ? '' : undefined}
                                    key={type}
                                    href={`#${type}`}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)] hover:text-[var(--sf-accent)]"
                                >
                                    {POLICY_LABELS[type]}
                                </a>
                            ))}
                        </div>

                        <div data-atelier-part={atelier ? "policy-body" : undefined} className="mt-8 space-y-6">
                            {POLICY_TYPES.map(type => (
                                <article data-ab-surface={adaptiveParts ? '' : undefined}
                                    id={type}
                                    key={type}
                                    className="scroll-mt-28 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 sm:p-6"
                                >
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <span data-ab-surface={adaptiveParts ? '' : undefined} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--sf-accent)] shadow-sm">
                                                <FileText size={20} />
                                            </span>
                                            <h2 className="text-xl font-black text-slate-950">{POLICY_LABELS[type]}</h2>
                                        </div>
                                        <Link
                                            href={`/policies/${type}`}
                                            className="text-sm font-black text-[var(--sf-accent)] hover:underline"
                                        >
                                            Open page
                                        </Link>
                                    </div>
                                    <div className="whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
                                        {getPolicyContent(policies, type, { storeName })}
                                    </div>
                                </article>
                            ))}
                        </div>

                        <Link data-ab-part={adaptiveParts ? 'links' : undefined} href="/" className="sf-btn sf-btn-secondary mt-8 inline-flex">
                            Back to store
                        </Link>
                    </div>
                </div>
            </section>
        </div>); }
