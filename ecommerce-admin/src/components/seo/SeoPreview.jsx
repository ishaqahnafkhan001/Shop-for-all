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

const sourceLabel = (value = '') => ({ manual: 'Manual', ai: 'AI approved', generated: 'Generated', fallback: 'Fallback', missing: 'Missing' }[value] || value);

export function SeoSnippetPreview({ title, url, canonical, description, robots, source = {}, socialImage, openGraph = {} }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Search size={14} />
                Google preview
            </div>
            <p className="truncate text-sm text-emerald-700">{url}</p>
            <p className="mt-1 line-clamp-1 text-lg font-semibold text-blue-700">{title}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{description}</p>
            <div className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:grid-cols-2">
                <p><span className="font-bold text-slate-700">Canonical:</span> {canonical || url}</p>
                <p><span className="font-bold text-slate-700">Robots:</span> {robots?.index ? 'index' : 'noindex'}, {robots?.follow ? 'follow' : 'nofollow'}</p>
                <p><span className="font-bold text-slate-700">Title source:</span> {sourceLabel(source.title) || 'Unknown'}</p>
                <p><span className="font-bold text-slate-700">Description source:</span> {sourceLabel(source.description) || 'Unknown'}</p>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {socialImage?.url && <img src={socialImage.url} alt={socialImage.alt || ''} className="aspect-[1.91/1] w-full border-b border-slate-200 object-cover" />}
                <div className="p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Social sharing preview</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{openGraph.title || title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{openGraph.description || description}</p>
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">{openGraph.siteName || ''}</p>
                </div>
            </div>
        </div>
    );
}

export function SeoHealthCard({ score, status, groups = {}, tasks = [], title = 'SEO health', description = 'Complete these basics so search engines and shoppers understand this page.', onIssueClick }) {
    const missing = tasks.filter(item => !item.done);
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">{title}</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">{score}/100</h3>
                    {status && <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{String(status).replace(/-/g, ' ')}</p>}
                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                </div>
                <div className="h-16 w-16 shrink-0 rounded-full border-8 border-indigo-100 text-center text-sm font-black leading-[48px] text-indigo-700">
                    {score}
                </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${score}%` }} />
            </div>
            {Object.keys(groups).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(groups).map(([group, value]) => (
                        <div key={group} className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-[10px] font-black uppercase text-slate-400">{group.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="mt-1 text-sm font-black text-slate-800">{value}/100</p>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 space-y-2">
                {(missing.length ? missing.slice(0, 5) : tasks.slice(0, 5)).map(item => (
                    <button
                        type="button"
                        key={`${item.fieldPath || ''}-${item.label}`}
                        onClick={() => onIssueClick?.(item)}
                        className={`flex w-full gap-2 rounded-lg p-1 text-left text-sm ${onIssueClick ? 'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500' : ''}`}
                    >
                        {item.done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <div>
                            <p className={`font-bold ${item.done ? 'text-slate-800' : 'text-slate-600'}`}>{item.label}</p>
                            {!item.done && item.action && <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.action}</p>}
                        </div>
                    </button>
                ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
                Recommended title: {SEO_TITLE_MIN}-{SEO_TITLE_MAX} characters. Recommended description: {SEO_DESCRIPTION_MIN}-{SEO_DESCRIPTION_MAX} characters.
            </p>
        </div>
    );
}
