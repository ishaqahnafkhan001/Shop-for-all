import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    Sparkles
} from 'lucide-react';

const homepageCheckCopy = {
    'site-name': {
        title: 'Set a clear Google site name',
        description: 'Use the public brand name shoppers know. Google may show it above your page title.',
        actionLabel: 'Edit site name'
    },
    'homepage-title': {
        title: 'Improve the homepage title',
        description: 'Name your store and its main offer clearly. The length guide helps prevent a title that is too vague or likely to be shortened.',
        actionLabel: 'Edit title',
        supportsAi: true
    },
    'title-length': {
        title: 'Improve the homepage title',
        description: 'Name your store and its main offer clearly. The length guide helps prevent a title that is too vague or likely to be shortened.',
        actionLabel: 'Edit title',
        supportsAi: true
    },
    'homepage-description': {
        title: 'Write a useful search description',
        description: 'Explain what you sell, who it is for, and what makes the store useful in natural language.',
        actionLabel: 'Edit description',
        supportsAi: true
    },
    'description-length': {
        title: 'Write a useful search description',
        description: 'Explain what you sell, who it is for, and what makes the store useful in natural language.',
        actionLabel: 'Edit description',
        supportsAi: true
    },
    canonical: {
        title: 'Review the canonical store address',
        description: 'Search engines need one authoritative HTTPS address for this storefront.',
        actionLabel: 'Review indexing'
    },
    'social-image': {
        title: 'Add a social sharing image',
        description: 'Use a clear landscape image so shared links look trustworthy on social and messaging apps.',
        actionLabel: 'Add image'
    },
    'social-image-alt': {
        title: 'Describe the social image',
        description: 'Add short, meaningful alt text that explains the image without repeating “image” or “photo.”',
        actionLabel: 'Add alt text'
    },
    'social-image-ratio': {
        title: 'Improve the social image shape',
        description: 'A landscape image close to 1.91:1 is less likely to be cropped when the store link is shared.',
        actionLabel: 'Review image'
    },
    'social-image-format': {
        title: 'Improve the social image quality',
        description: 'Use a supported, sufficiently large image for a clearer sharing preview.',
        actionLabel: 'Review image'
    },
    'public-h1': {
        title: 'Align the visible homepage heading',
        description: 'The main banner heading should clearly match what the store sells and support the search title.',
        actionLabel: 'Open Store Builder'
    },
    'active-collections': {
        title: 'Create a public collection',
        description: 'Collections give shoppers and search engines useful paths into related products.',
        actionLabel: 'Open Catalog Tools'
    },
    'internal-links': {
        title: 'Add useful storefront links',
        description: 'Link to important products, collections, policies, or account pages so visitors can navigate naturally.',
        actionLabel: 'Edit navigation'
    },
    'image-alt-coverage': {
        title: 'Improve product image descriptions',
        description: 'Add accurate alt text to product images so search engines and assistive technology understand them.',
        actionLabel: 'Open products'
    },
    'google-verification': {
        title: 'Connect Google Search Console',
        description: 'Verification lets the store owner submit the sitemap and inspect how Google crawls the storefront.',
        actionLabel: 'Add verification code'
    },
    'social-profiles': {
        title: 'Connect a public social profile',
        description: 'A genuine public profile helps search engines connect the store with its wider brand identity.',
        actionLabel: 'Edit footer links'
    },
    'metadata-freshness': {
        title: 'Refresh older SEO suggestions',
        description: 'Store content changed after the last suggestion, so review the title and description again.',
        actionLabel: 'Open AI assistant',
        supportsAi: true
    }
};

const homepageCheckKey = (check = {}) => ({
    'title-length': 'homepage-title',
    'description-length': 'homepage-description',
    'social-image-ratio': 'social-image',
    'social-image-format': 'social-image'
}[check.id] || check.id || check.fieldPath || check.message);

const isHomepageCheckComplete = (check = {}) => {
    if (check.status === 'complete') return true;
    if (check.status !== 'generated') return false;
    return !['site-name', 'homepage-title', 'homepage-description'].includes(check.actionKey);
};
const checkPriority = (check = {}) => {
    const state = { blocked: 500, invalid: 450, missing: 350, warning: 250, fallback: 150 }[check.status] || 0;
    const severity = { high: 80, medium: 40, low: 10 }[check.severity] || 0;
    return state + severity + Number(check.weight || 0);
};

const prepareHomepageChecks = (checks = []) => {
    const grouped = new Map();
    checks.forEach((check) => {
        const key = homepageCheckKey(check);
        const current = grouped.get(key);
        const messages = [...(current?.messages || []), check.message].filter(Boolean);
        const preferred = !current || checkPriority(check) > checkPriority(current) ? check : current;
        grouped.set(key, { ...preferred, actionKey: key, messages });
    });
    return [...grouped.values()];
};

const groupLabel = (value = '') => ({
    content: 'Content',
    technical: 'Technical',
    social: 'Social sharing',
    structuredData: 'Structured data',
    indexing: 'Indexing'
}[value] || value.replace(/([A-Z])/g, ' $1'));

const readinessLabel = (status = '') => ({
    optimized: 'Strong foundation',
    'needs-improvement': 'Needs improvement',
    poor: 'Needs attention',
    blocked: 'Indexing blocked'
}[status] || String(status).replace(/-/g, ' '));

function HomepageActionRow({ check, onAction, onAiClick }) {
    const copy = homepageCheckCopy[check.actionKey] || {
        title: check.message || 'Review this SEO setting',
        description: 'Review this item and update the related storefront setting where appropriate.',
        actionLabel: 'Review setting'
    };
    const detail = check.messages?.find(message => /\d+ characters|\d+%|ratio is/i.test(message))
        || check.messages?.find(message => message && message !== copy.title && message !== copy.description);
    return (
        <article className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                        check.severity === 'high' || ['blocked', 'invalid'].includes(check.status)
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                    }`}>
                        {check.severity === 'high' || ['blocked', 'invalid'].includes(check.status) ? 'High priority' : 'Recommended'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{groupLabel(check.group)}</span>
                </div>
                <h4 className="mt-2 text-base font-black text-slate-950">{copy.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">{copy.description}</p>
                {detail && <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Current check: {detail}</p>}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
                {copy.supportsAi && onAiClick && (
                    <button
                        type="button"
                        onClick={onAiClick}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <Sparkles size={16} /> Use AI
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onAction?.(check)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    {copy.actionLabel} <ArrowRight size={16} />
                </button>
            </div>
        </article>
    );
}

export function HomepageSeoActionCenter({ score, status, groups = {}, checks = [], visibility, onAction, onAiClick }) {
    const prepared = prepareHomepageChecks(checks);
    const incomplete = prepared
        .filter(check => !isHomepageCheckComplete(check) && check.id !== 'indexability')
        .sort((a, b) => checkPriority(b) - checkPriority(a));
    const completed = prepared.filter(isHomepageCheckComplete);
    const firstActions = incomplete.slice(0, 3);
    const laterActions = incomplete.slice(3);
    const scoreWidth = Math.max(0, Math.min(100, Number(score || 0)));

    return (
        <section className="space-y-5" aria-labelledby="seo-action-center-title">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">SEO readiness</p>
                        <h2 id="seo-action-center-title" className="mt-1 text-2xl font-black text-slate-950">Your next SEO steps</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            Complete the highest-impact basics first. This readiness score checks setup quality; it does not guarantee a Google ranking.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Current score</p>
                            <p className="text-xl font-black text-slate-950">{scoreWidth}/100</p>
                        </div>
                        <span className="max-w-28 text-right text-xs font-bold capitalize text-slate-500">{readinessLabel(status)}</span>
                    </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${scoreWidth}%` }} />
                </div>
            </div>

            {visibility && (
                <div className={`rounded-lg border p-4 ${visibility.blocked ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`} role="status">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                            {visibility.blocked
                                ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
                                : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />}
                            <div>
                                <h3 className={`font-black ${visibility.blocked ? 'text-rose-950' : 'text-emerald-950'}`}>{visibility.title}</h3>
                                <p className={`mt-1 text-sm leading-6 ${visibility.blocked ? 'text-rose-800' : 'text-emerald-800'}`}>{visibility.description}</p>
                            </div>
                        </div>
                        {visibility.action && (
                            <button
                                type="button"
                                onClick={() => onAction?.(visibility.action)}
                                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                {visibility.actionLabel || 'Review setting'} <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Fix these first</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">Recommended actions</h3>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">{incomplete.length} item{incomplete.length === 1 ? '' : 's'} remaining</p>
                </div>
                {firstActions.length ? (
                    <div className="mt-4 space-y-3">
                        {firstActions.map(check => <HomepageActionRow key={check.actionKey} check={check} onAction={onAction} onAiClick={onAiClick} />)}
                    </div>
                ) : (
                    <div className="mt-4 flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-900">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <div><p className="font-black">The main SEO setup is complete</p><p className="mt-1 text-sm">Keep product content accurate and review this page after major storefront changes.</p></div>
                    </div>
                )}
                {laterActions.length > 0 && (
                    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                            More recommendations ({laterActions.length}) <ChevronDown size={17} />
                        </summary>
                        <div className="space-y-3 border-t border-slate-200 p-3">
                            {laterActions.map(check => <HomepageActionRow key={check.actionKey} check={check} onAction={onAction} onAiClick={onAiClick} />)}
                        </div>
                    </details>
                )}
            </div>

            <details className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                    Technical score breakdown <ChevronDown size={18} />
                </summary>
                <div className="border-t border-slate-200 p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {Object.entries(groups).map(([group, value]) => (
                            <div key={group} className="rounded-lg bg-slate-50 p-3">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{groupLabel(group)}</p>
                                <p className="mt-1 text-lg font-black text-slate-900">{value}/100</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-slate-500">
                        Title and description lengths are practical guidance, not fixed Google limits. Search engines may rewrite displayed titles and descriptions.
                    </p>
                </div>
            </details>

            <details className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                    Completed checks ({completed.length}) <ChevronDown size={18} />
                </summary>
                <div className="grid gap-2 border-t border-slate-200 p-5 sm:grid-cols-2">
                    {completed.map(check => (
                        <div key={check.actionKey} className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="font-semibold">{check.message}</span>
                        </div>
                    ))}
                </div>
            </details>
        </section>
    );
}
