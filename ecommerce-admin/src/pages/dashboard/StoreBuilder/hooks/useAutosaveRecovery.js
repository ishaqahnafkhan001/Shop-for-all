import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../../../../api/api.js';
import { createDraftWriteQueue } from './draftWriteQueue';

const LOCAL_PREFIX = 'scaleup:store-builder:draft:';
const readLocal = key => {
    try { return key ? JSON.parse(window.localStorage.getItem(`${LOCAL_PREFIX}${key}`) || 'null') : null; }
    catch { return null; }
};

export function useAutosaveRecovery({ shopKey, enabled, currentSnapshot, theme,
    searchAliases, customDomain, storewideDiscount, basedOnRevision, initialDraftVersion = null }) {
    const [status, setStatus] = useState('idle');
    const [lastSavedAt, setLastSavedAt] = useState('');
    const lastSentSnapshot = useRef('');
    const localSavedSnapshot = useRef('');
    const latestSnapshot = useRef(currentSnapshot);
    latestSnapshot.current = currentSnapshot;
    const timerRef = useRef(null);
    const localRecovery = useMemo(() => readLocal(shopKey), [shopKey]);
    const queueRef = useRef(null);
    const initialVersionRef = useRef(initialDraftVersion);
    initialVersionRef.current = initialDraftVersion;

    useEffect(() => {
        lastSentSnapshot.current = '';
        const queue = createDraftWriteQueue({
            initialVersion: initialVersionRef.current,
            save: async payload => (await API.put('/store-builder/admin/draft', { ...payload, expectedShopId: shopKey })).data.data,
            remove: version => API.delete('/store-builder/admin/draft', { data: { expectedDraftUpdatedAt: version, expectedShopId: shopKey } }),
        });
        queueRef.current = queue;
        return () => { queue.close(); window.clearTimeout(timerRef.current); };
    }, [shopKey]);

    const payload = { theme, searchAliases, customDomain, storewideDiscount, basedOnRevision };
    const persist = async () => {
        const queue = queueRef.current;
        if (!shopKey || !queue) return;
        setStatus('saving');
        try {
            const saved = await queue.save(payload);
            if (!saved || queueRef.current !== queue) return;
            lastSentSnapshot.current = currentSnapshot;
            setLastSavedAt(saved.updatedAt);
            setStatus(latestSnapshot.current === currentSnapshot ? 'saved' : 'pending');
            return saved;
        } catch (error) {
            if (queueRef.current === queue) setStatus(error.response?.status === 409 ? 'conflict'
                : localSavedSnapshot.current === currentSnapshot ? 'local-only' : 'error');
            throw error;
        }
    };

    useEffect(() => {
        if (!shopKey || !enabled || !currentSnapshot || currentSnapshot === lastSentSnapshot.current) return;
        try {
            window.localStorage.setItem(`${LOCAL_PREFIX}${shopKey}`, JSON.stringify({
                snapshot: currentSnapshot, basedOnRevision, savedAt: new Date().toISOString(),
            }));
            localSavedSnapshot.current = currentSnapshot;
        } catch { /* Storage restrictions must not prevent a server save. */ }
        timerRef.current = window.setTimeout(() => { persist().catch(() => {}); }, 1400);
        return () => window.clearTimeout(timerRef.current);
    }, [basedOnRevision, currentSnapshot, customDomain, enabled, searchAliases, shopKey, storewideDiscount, theme]);

    const pause = async () => {
        window.clearTimeout(timerRef.current);
        await queueRef.current?.pause();
    };
    const clearRecovery = async ({ clearServer = true } = {}) => {
        window.clearTimeout(timerRef.current);
        await queueRef.current?.clear({ clearServer });
        try { if (shopKey) window.localStorage.removeItem(`${LOCAL_PREFIX}${shopKey}`); } catch { /* Optional storage. */ }
        lastSentSnapshot.current = '';
        localSavedSnapshot.current = '';
        setStatus('idle');
    };
    return { status, lastSavedAt, localRecovery, clearRecovery, pause,
        resume: () => queueRef.current?.resume(),
        resetVersion: value => queueRef.current?.resetVersion(value),
        saveNow: () => { window.clearTimeout(timerRef.current); return persist(); } };
}
