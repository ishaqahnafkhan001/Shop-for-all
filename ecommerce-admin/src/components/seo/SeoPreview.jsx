import { CheckCircle2, Circle, Search } from 'lucide-react';
import {
    getLengthStatus,
    SEO_DESCRIPTION_MAX,
    SEO_DESCRIPTION_MIN,
    SEO_TITLE_MAX,
    SEO_TITLE_MIN
} from '../../utils/seoHealth.js';

const toneClass = {
    empty: 'text-slate-400',
    short: 'text-amber-600',
    long: 'text-rose-600',
    good: 'text-emerald-600'
};

export function SeoLengthHint({ value = '', min, max, label }) {
    const status = getLengthStatus(value, min, max);
    return (
        <p className={`mt-1 text-xs font-semibold ${toneClass[status.tone] || 'text-slate-500'}`}>
            {label}: {status.length}/{max} characters · {status.message}
        </p>
    );
}

export function SeoSnippetPreview({ title, url, description }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Search size={14} />
                Google preview
            </div>
            <p className="truncate text-sm text-emerald-700">{url}</p>
            <p className="mt-1 line-clamp-1 text-lg font-semibold text-blue-700">{title}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
    );
}

export function SeoHealthCard({ score, tasks = [], title = 'SEO health', description = 'Complete these basics so search engines and shoppers understand this page.' }) {
    const missing = tasks.filter(item => !item.done);
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">{title}</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">{score}/100</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                </div>
                <div className="h-16 w-16 shrink-0 rounded-full border-8 border-indigo-100 text-center text-sm font-black leading-[48px] text-indigo-700">
                    {score}
                </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${score}%` }} />
            </div>
            <div className="mt-4 space-y-2">
                {(missing.length ? missing.slice(0, 5) : tasks.slice(0, 5)).map(item => (
                    <div key={item.label} className="flex gap-2 text-sm">
                        {item.done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <div>
                            <p className={`font-bold ${item.done ? 'text-slate-800' : 'text-slate-600'}`}>{item.label}</p>
                            {!item.done && item.action && <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.action}</p>}
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
                Recommended title: {SEO_TITLE_MIN}-{SEO_TITLE_MAX} characters. Recommended description: {SEO_DESCRIPTION_MIN}-{SEO_DESCRIPTION_MAX} characters.
            </p>
        </div>
    );
}

