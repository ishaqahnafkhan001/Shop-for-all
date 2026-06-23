import { Lock } from 'lucide-react';

export default function CheckoutLoading() {
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <div className="h-8 w-44 animate-pulse rounded-full bg-white" />
                        <div className="mt-3 h-4 w-64 animate-pulse rounded-full bg-white" />
                    </div>
                    <div className="hidden h-11 w-36 animate-pulse rounded-full bg-white sm:block" />
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-4">
                        {[0, 1, 2].map(section => (
                            <div key={section} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="h-5 w-40 animate-pulse rounded-full bg-slate-100" />
                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {[0, 1, 2, 3].map(item => (
                                        <div key={item} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-500">
                            <Lock size={16} />
                            Secure checkout
                        </div>
                        <div className="mt-5 space-y-3">
                            {[0, 1, 2].map(item => (
                                <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                            ))}
                        </div>
                        <div className="mt-6 h-12 animate-pulse rounded-full bg-slate-100" />
                    </aside>
                </div>
            </div>
        </div>
    );
}
