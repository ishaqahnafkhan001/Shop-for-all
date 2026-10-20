export default function ProductDetailLoading() {
    return (
        <div className="sf-page">
            <div className="sf-shell-wide py-5 sm:py-8 lg:py-10">
                <div className="mb-6 h-10 w-44 animate-pulse rounded-full bg-white" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.82fr)] lg:gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.72fr)]">
                    <div className="min-w-0">
                        <div className="aspect-[4/5] animate-pulse rounded-[2rem] border border-slate-200 bg-white shadow-sm sm:aspect-[5/4] lg:aspect-square" />
                        <div className="mt-4 grid grid-cols-4 gap-3">
                            {[0, 1, 2, 3].map(item => (
                                <div key={item} className="aspect-square animate-pulse rounded-2xl bg-white shadow-sm" />
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/70 sm:p-6 lg:rounded-[2.25rem] lg:p-7">
                        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-100" />
                        <div className="mt-5 h-16 animate-pulse rounded-3xl bg-slate-100" />
                        <div className="mt-5 h-24 animate-pulse rounded-3xl bg-slate-100" />
                        <div className="mt-5 h-36 animate-pulse rounded-3xl bg-slate-100" />
                        <div className="mt-5 h-14 animate-pulse rounded-full bg-slate-100" />
                    </div>
                </div>
            </div>
        </div>
    );
}
