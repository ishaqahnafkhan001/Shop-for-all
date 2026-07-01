const AdminRouteFallback = () => (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="mt-4 h-8 w-28 animate-pulse rounded bg-slate-200" />
                </div>
            ))}
        </div>
        <div className="h-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
    </div>
);

export default AdminRouteFallback;
