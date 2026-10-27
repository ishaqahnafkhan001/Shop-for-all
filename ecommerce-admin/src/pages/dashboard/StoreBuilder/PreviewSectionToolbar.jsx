import { Eye, EyeOff, Lock, Pencil } from 'lucide-react';
export default function PreviewSectionToolbar ({
    id,
    label,
    locked,
    section,
    sectionIndex,
    onSelectElement,
    onToggleSectionVisibility
}) {
    const isDynamicSection = (id?.startsWith('section:') || id?.startsWith('section-')) && Number.isInteger(sectionIndex) && sectionIndex >= 0;
    const isVisible = section?.isEnabled !== false;
    const stop = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    const handleAction = (event, action) => {
        stop(event);
        action?.();
    };
    const buttonClass = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <div
            className="absolute right-3 top-3 z-[90] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-950/15 backdrop-blur"
            onMouseDown={stop}
            onClick={stop}
        >
            <span className="max-w-[160px] truncate rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-black text-white">
                {label || 'Section'}
            </span>
            {locked && (
                <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-50 px-2 text-[11px] font-black text-amber-800">
                    <Lock size={12} />
                    Locked layout
                </span>
            )}
            <button type="button" className={buttonClass} onClick={event => handleAction(event, () => onSelectElement?.(id))} aria-label={`Edit ${label || 'section'}`}>
                <Pencil size={13} />
                Edit
            </button>
            {isDynamicSection && (
                <>
                    <button type="button" className={buttonClass} onClick={event => handleAction(event, () => onToggleSectionVisibility?.(sectionIndex, !isVisible))} aria-label={`${isVisible ? 'Hide' : 'Show'} ${label || 'section'}`}>
                        {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        {isVisible ? 'Hide' : 'Show'}
                    </button>
                </>
            )}
        </div>
    );
}
