import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BuilderDrawer({ open, title, description, onClose, children }) {
    const panelRef = useRef(null);
    const returnFocusRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        returnFocusRef.current = document.activeElement;
        const panel = panelRef.current;
        const first = panel?.querySelector(focusableSelector);
        first?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !panel) return;
            const controls = [...panel.querySelectorAll(focusableSelector)];
            if (!controls.length) return;
            const firstControl = controls[0];
            const lastControl = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === firstControl) {
                event.preventDefault();
                lastControl.focus();
            } else if (!event.shiftKey && document.activeElement === lastControl) {
                event.preventDefault();
                firstControl.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            returnFocusRef.current?.focus?.();
        };
    }, [onClose, open]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[90]" role="presentation">
            <button type="button" className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label={`Close ${title}`} />
            <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="builder-drawer-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 id="builder-drawer-title" className="text-lg font-black text-slate-950">{title}</h2>
                        {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <X className="mx-auto" size={20} />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
            </aside>
        </div>
    );
}
