import { useEffect, useRef } from 'react';

export function StoreBuilderShell({ header, notices, navigation, preview, inspector, drawers, publishDialog, children, busy = false }) {
    const root = useRef(null);
    useEffect(() => {
        const headerElement = root.current?.querySelector('[data-builder-header]');
        if (!headerElement) return;
        const measure = () => root.current?.style.setProperty('--builder-header-height', `${headerElement.getBoundingClientRect().height + 12}px`);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(headerElement);
        return () => observer.disconnect();
    }, []);
    if (children) return <div ref={root} inert={busy || undefined} aria-busy={busy} className="store-builder-shell min-h-full bg-slate-50">{children}</div>;
    return (
        <div ref={root} className="store-builder-shell min-h-full bg-slate-50">
            {header}
            {notices}
            <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(520px,1fr)_380px]">
                {navigation}
                {preview}
                {inspector}
            </div>
            {drawers}
            {publishDialog}
        </div>
    );
}
