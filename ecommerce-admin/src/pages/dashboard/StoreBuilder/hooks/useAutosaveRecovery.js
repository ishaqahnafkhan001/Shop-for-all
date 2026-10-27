import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import API from '../../../../api/api.js';
import { createDraftWriteQueue } from './draftWriteQueue';
import { parseBuilderRecovery } from '../adaptive/adaptiveEditorState.js';

const LOCAL_PREFIX = 'scaleup:store-builder:draft:';
const readLocal = key => {
    try {
        const raw = key ? window.localStorage.getItem(`${LOCAL_PREFIX}${key}`) : null;
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return { formatVersion: 'unreadable' }; }
    }
    catch { return null; }
};

export function useAutosaveRecovery({ shopKey, enabled, currentSnapshot, theme,
    searchAliases, customDomain, storewideDiscount, basedOnRevision, initialDraftVersion = null, api = API, recoveryKey = shopKey }) {
    const [status, setStatus] = useState('idle');
    const [lastSavedAt, setLastSavedAt] = useState('');
    const [recoveryEpoch, setRecoveryEpoch] = useState(0);
    const lastSentSnapshot = useRef('');
    const localSavedSnapshot = useRef('');
    const latestSnapshot = useRef(currentSnapshot);
    const timerRef = useRef(null);
    const localRecovery = useMemo(() => { void recoveryEpoch; return readLocal(recoveryKey); }, [recoveryKey, recoveryEpoch]);
    const localRecoveryCheck = useMemo(() => parseBuilderRecovery(localRecovery, basedOnRevision), [localRecovery, basedOnRevision]);
    const queueRef = useRef(null);
    const initialVersionRef = useRef(initialDraftVersion);
    useLayoutEffect(() => { latestSnapshot.current = currentSnapshot; initialVersionRef.current = initialDraftVersion; }, [currentSnapshot, initialDraftVersion]);
    const resetVersion = useCallback(value => queueRef.current?.resetVersion(value), []);

    useEffect(() => {
        lastSentSnapshot.current = '';
        const queue = createDraftWriteQueue({
            initialVersion: initialVersionRef.current,
            save: async payload => (await api.put('/store-builder/admin/draft', { ...payload, expectedShopId: shopKey })).data.data,
            remove: version => api.delete('/store-builder/admin/draft', { data: { expectedDraftUpdatedAt: version, expectedShopId: shopKey } }),
        });
        queueRef.current = queue;
        return () => { queue.close(); window.clearTimeout(timerRef.current); };
    }, [shopKey, api]);

    const persist = useCallback(async () => {
        const payload = { theme, searchAliases, customDomain, storewideDiscount, basedOnRevision };
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
    }, [theme, searchAliases, customDomain, storewideDiscount, basedOnRevision, shopKey, currentSnapshot]);

    useEffect(() => {
        if (!shopKey || !enabled || !currentSnapshot || currentSnapshot === lastSentSnapshot.current) return;
        try {
            if (!localRecovery || localRecoveryCheck.compatible) {
                window.localStorage.setItem(`${LOCAL_PREFIX}${recoveryKey}`, JSON.stringify({
                    formatVersion: 1, themeSchemaVersion: Number(theme.version), snapshot: currentSnapshot, basedOnRevision, savedAt: new Date().toISOString(),
                }));
                localSavedSnapshot.current = currentSnapshot;
            }
        } catch { /* Storage restrictions must not prevent a server save. */ }
        timerRef.current = window.setTimeout(() => { persist().catch(() => {}); }, 1400);
        return () => window.clearTimeout(timerRef.current);
    }, [basedOnRevision, currentSnapshot, enabled, shopKey, recoveryKey, theme.version, localRecovery, localRecoveryCheck.compatible, persist]);

    const pause = async () => {
        window.clearTimeout(timerRef.current);
        await queueRef.current?.pause();
    };
    const clearRecovery = async ({ clearServer = true, discardUnknown = false } = {}) => {
        window.clearTimeout(timerRef.current);
        await queueRef.current?.clear({ clearServer });
        try { if (recoveryKey && (discardUnknown || !localRecovery || localRecoveryCheck.compatible)) window.localStorage.removeItem(`${LOCAL_PREFIX}${recoveryKey}`); } catch { /* Optional storage. */ }
        setRecoveryEpoch(value => value + 1);
        lastSentSnapshot.current = '';
        localSavedSnapshot.current = '';
        setStatus('idle');
    };
    return { status, lastSavedAt, localRecovery, localRecoveryIssue: localRecovery && !localRecoveryCheck.compatible ? localRecoveryCheck.message : '', clearRecovery, pause,
        resume: () => queueRef.current?.resume(),
        resetVersion,
        saveNow: () => { window.clearTimeout(timerRef.current); return persist(); } };
}
