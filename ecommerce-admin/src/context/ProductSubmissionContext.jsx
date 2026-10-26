/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from './AuthContext';
import { ProductSubmissionManager, productSubmissionScope, ACTIVE_PRODUCT_STATES } from '../services/productSubmissionManager.js';
import { productSubmissionStore } from '../services/productSubmissionStore.js';

const Context = createContext(null);

function ScopedProvider({ scope, children }) {
    const [records, setRecords] = useState([]);
    const [revision, setRevision] = useState(0);
    const [storageError, setStorageError] = useState('');
    const [activityOpen, setActivityOpen] = useState(false);
    const [activityTab, selectActivityTab] = useState('unfinished');
    const manager = useMemo(() => new ProductSubmissionManager({
        scope, api: API, store: productSubmissionStore, changed: setRecords,
        catalogChanged: () => setRevision(value => value + 1),
        storageFailed: setStorageError,
        notify: (kind, record) => {
            if (kind === 'success') {
                toast.success(<span>Product added successfully <Link className="inline-flex min-h-9 items-center font-semibold underline" to={`/dashboard/products/edit/${record.productId}`}>View Product</Link></span>, { id: `product-${record.id}` });
            } else if (kind === 'failure') {
                toast.error(<span>Couldn&apos;t save your product — <Link className="inline-flex min-h-9 items-center font-semibold underline" to={`/dashboard/products/add?recover=${record.id}`}>Review &amp; Retry</Link></span>, { id: `product-${record.id}`, duration: 7000 });
            } else {
                toast(<span>We couldn&apos;t confirm your product yet <button className="min-h-9 font-semibold underline" onClick={() => { selectActivityTab('unfinished'); setActivityOpen(true); }}>Check Status</button></span>, { id: `product-${record.id}`, duration: 7000 });
            }
        }
    }), [scope]);

    useEffect(() => {
        if (scope) manager.start().catch(error => { if (manager.active) setStorageError(error.message); });
        return () => manager.dispose();
    }, [manager, scope]);

    useEffect(() => {
        const refresh = () => { if (scope && document.visibilityState !== 'hidden') manager.sync().catch(error => setStorageError(error.message)); };
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
    }, [manager, scope]);

    useEffect(() => {
        if (!records.some(record => ACTIVE_PRODUCT_STATES.includes(record.state))) return undefined;
        const warn = event => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [records]);

    return <Context.Provider value={{ manager, records, revision, storageError, activityOpen, activityTab, openActivity: (tab = 'unfinished') => { selectActivityTab(tab); setActivityOpen(true); }, closeActivity: () => setActivityOpen(false), selectActivityTab }}>{children}</Context.Provider>;
}

export function ProductSubmissionProvider({ children }) {
    const { user } = useAuth();
    const scope = productSubmissionScope(user);
    return <ScopedProvider key={scope} scope={scope}>{children}</ScopedProvider>;
}

export function useProductSubmissions() { return useContext(Context); }
