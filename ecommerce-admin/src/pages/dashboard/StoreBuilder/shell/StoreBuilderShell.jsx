export function StoreBuilderShell({ header, notices, navigation, preview, inspector, drawers, publishDialog, children }) {
    if (children) return <div className="min-h-full bg-slate-50">{children}</div>;
    return (
        <div className="min-h-full bg-slate-50">
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
