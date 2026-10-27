import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../../api/api.js';
import StoreBuilderPage from './StoreBuilderPage.jsx';
import { createDevelopmentTransport } from './adaptive/developmentTransport.js';

export default function DevelopmentStoreBuilderPage() {
    const [state, setState] = useState({ api: null, error: '' });
    useEffect(() => {
        if (!import.meta.env.DEV) return;
        const controller = new AbortController();
        API.get('/store-builder/admin/development-preview', { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) setState({ api: createDevelopmentTransport(data.grant), error: '' });
        }).catch(error => { if (!controller.signal.aborted) setState({ api: null, error: error.response?.data?.error || error.message }); });
        return () => controller.abort();
    }, []);
    if (!import.meta.env.DEV) return <p role="status">Development preview is unavailable.</p>;
    return <><div className="m-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950"><h1 className="font-bold">Adaptive Builder · local development</h1><p>Synthetic examples only. Drafts stay in this browser. Publication, media uploads and real commerce actions are disabled.</p><Link className="inline-flex min-h-11 items-center font-semibold underline" to="/dashboard/store-builder">Back to merchant Store Builder</Link></div>
        {state.error ? <p role="alert" className="m-4 rounded-lg border border-amber-300 p-4">{state.error} Ask the local developer to configure the authorized shop allowlist.</p> : state.api ? <StoreBuilderPage api={state.api} developmentPreview /> : <p role="status" className="p-4">Verifying authenticated development access…</p>}
    </>;
}
