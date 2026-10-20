import { ShoppingBag } from 'lucide-react';

export default function StorefrontLoading() {
    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="mb-4 h-[390px] animate-pulse rounded-[1.25rem] bg-slate-100 sm:h-[520px] sm:rounded-[2rem]" />

                <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map(item => (
                        <div key={item} className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm" />
                    ))}
                </div>

                <div className="mt-10 flex items-end justify-between gap-4">
                    <div>
                        <div className="h-8 w-44 animate-pulse rounded-full bg-slate-100" />
                        <div className="mt-3 h-4 w-60 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="hidden h-11 w-40 animate-pulse rounded-full bg-slate-100 sm:block" />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {[0, 1, 2, 3, 4, 5].map(item => (
                        <div key={item} className="rounded-[1.35rem] border border-slate-100 bg-white p-2.5 shadow-sm">
                            <div className="aspect-square animate-pulse rounded-[1.15rem] bg-slate-100" />
                            <div className="mt-3 h-3 w-16 animate-pulse rounded-full bg-slate-100" />
                            <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-100" />
                            <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
                            <div className="mt-4 flex items-center justify-between gap-2">
                                <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-200">
                                    <ShoppingBag size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
