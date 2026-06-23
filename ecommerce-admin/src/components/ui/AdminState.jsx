import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

const toneStyles = {
    slate: 'border-slate-200 bg-white text-slate-700',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-900',
    rose: 'border-rose-100 bg-rose-50 text-rose-900',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-900'
};

export const AdminLoadingState = ({
    title = 'Loading',
    description = 'Please wait while we prepare this page.',
    className = ''
}) => (
    <div className={`rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm ${className}`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="mt-4 font-bold text-slate-950">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
);

export const AdminEmptyState = ({
    icon: Icon = Sparkles,
    title = 'Nothing here yet',
    description = 'Items will appear here when they are available.',
    action = null,
    tone = 'slate',
    className = ''
}) => (
    <div className={`rounded-2xl border border-dashed p-8 text-center shadow-sm ${toneStyles[tone] || toneStyles.slate} ${className}`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm ring-1 ring-black/5">
            <Icon className="h-7 w-7" strokeWidth={1.7} />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
);

export const AdminErrorState = ({
    title = 'Something went wrong',
    description = 'Refresh the page or try again in a moment.',
    action = null,
    className = ''
}) => (
    <div className={`rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm ${className}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
                <div className="rounded-xl bg-white p-2 text-rose-600 shadow-sm">
                    <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                    <p className="font-black">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-rose-800/80">{description}</p>
                </div>
            </div>
            {action}
        </div>
    </div>
);
