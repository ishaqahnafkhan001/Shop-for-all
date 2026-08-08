import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const CHUNK_RELOAD_KEY = 'scaleup:route-chunk-reload';
const CHUNK_RELOAD_WINDOW_MS = 60_000;

const isChunkLoadError = (error) => {
    const message = String(error?.message || error || '').toLowerCase();
    return [
        'failed to fetch dynamically imported module',
        'error loading dynamically imported module',
        'importing a module script failed',
        'loading chunk',
        'chunkloaderror'
    ].some(fragment => message.includes(fragment));
};

class RouteErrorBoundary extends Component {
    state = { error: null };

    cleanupTimer = null;

    componentDidMount() {
        this.cleanupTimer = window.setTimeout(() => {
            try {
                window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            } catch {
                // Storage can be unavailable in privacy-focused browser modes.
            }
        }, 10_000);
    }

    componentDidCatch(error, errorInfo) {
        console.error('Admin route render failed', error, errorInfo);

        if (!isChunkLoadError(error)) return;

        try {
            const lastReloadAt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
            if (Date.now() - lastReloadAt < CHUNK_RELOAD_WINDOW_MS) return;
            window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
            window.location.reload();
        } catch {
            // The visible recovery state remains available when storage is blocked.
        }
    }

    componentWillUnmount() {
        if (this.cleanupTimer) window.clearTimeout(this.cleanupTimer);
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    reloadPage = () => {
        window.location.reload();
    };

    goToDashboard = () => {
        window.location.assign('/dashboard');
    };

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <section className="mx-auto flex min-h-[420px] w-full max-w-3xl items-center justify-center p-6 sm:p-10">
                <div className="w-full rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-8">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                        <AlertTriangle aria-hidden="true" size={24} />
                    </span>
                    <h1 className="mt-4 text-xl font-black text-slate-950">This page could not finish loading</h1>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        The admin app may have been updated while this tab was open. Reload to use the latest version. Your saved store data is not affected.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={this.goToDashboard}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            Back to dashboard
                        </button>
                        <button
                            type="button"
                            onClick={this.reloadPage}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            <RefreshCw aria-hidden="true" size={17} />
                            Reload page
                        </button>
                    </div>
                </div>
            </section>
        );
    }
}

export default RouteErrorBoundary;
