import { CheckCircle2, Circle, Info, Sparkles } from 'lucide-react';

export const ProductFormSection = ({
    title,
    description,
    icon: Icon = Sparkles,
    children,
    actions = null,
    className = ''
}) => (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
                <div className="mt-0.5 rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <Icon size={18} />
                </div>
                <div>
                    <h2 className="font-black text-slate-950">{title}</h2>
                    {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
                </div>
            </div>
            {actions}
        </div>
        <div className="space-y-4">{children}</div>
    </section>
);

export const SellerHint = ({ children, tone = 'indigo' }) => {
    const toneClass = {
        indigo: 'border-indigo-100 bg-indigo-50 text-indigo-900',
        amber: 'border-amber-100 bg-amber-50 text-amber-900',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-900',
        slate: 'border-slate-200 bg-slate-50 text-slate-700'
    }[tone] || 'border-indigo-100 bg-indigo-50 text-indigo-900';

    return (
        <div className={`flex gap-2 rounded-xl border px-3 py-2 text-sm leading-6 ${toneClass}`}>
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{children}</p>
        </div>
    );
};

export const ImageEmptyState = ({ selectedCount = 0, max = 5 }) => (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <p className="font-black text-slate-900">
            {selectedCount > 0 ? `${selectedCount} image${selectedCount === 1 ? '' : 's'} selected` : 'Add clear product images'}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
            Upload up to {max} images. Use the first image as the best front view because it appears in product cards.
        </p>
    </div>
);

export const ReadinessChecklist = ({ items = [], title = 'Product readiness' }) => {
    const complete = items.filter(item => item.done).length;

    return (
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Seller guide</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
                Complete the essentials before publishing so shoppers can trust and buy this product.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.round((complete / Math.max(items.length, 1)) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">{complete} of {items.length} ready</p>
            <div className="mt-4 space-y-3">
                {items.map(item => (
                    <div key={item.label} className="flex gap-2">
                        {item.done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <div>
                            <p className={`text-sm font-bold ${item.done ? 'text-slate-800' : 'text-slate-500'}`}>{item.label}</p>
                            {item.helper && <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.helper}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};
