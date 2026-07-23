import { useEffect, useMemo, useRef, useState } from 'react';

import API from '../../../../api/api.js';

const LOCAL_PREFIX = 'scaleup:store-builder:draft:';

const readLocal = (key) => {
    if (!key) return null;
    try {
        return JSON.parse(window.localStorage.getItem(`${LOCAL_PREFIX}${key}`) || 'null');
    } catch {
        return null;
    }
};

export function useAutosaveRecovery({
    shopKey,
    enabled,
    currentSnapshot,
    theme,
    searchAliases,
    customDomain,
    storewideDiscount,
    basedOnRevision
}) {
    const [status, setStatus] = useState('idle');
    const [lastSavedAt, setLastSavedAt] = useState('');
    const lastSentSnapshot = useRef('');
    const localRecovery = useMemo(() => readLocal(shopKey), [shopKey]);

    useEffect(() => {
        if (!shopKey || !enabled || !currentSnapshot || currentSnapshot === lastSentSnapshot.current) return undefined;
        const savedAt = new Date().toISOString();
        const localPayload = { snapshot: currentSnapshot, basedOnRevision, savedAt };
        window.localStorage.setItem(`${LOCAL_PREFIX}${shopKey}`, JSON.stringify(localPayload));

        const timer = window.setTimeout(async () => {
            setStatus('saving');
            try {
                await API.put('/store-builder/admin/draft', {
                    theme,
                    searchAliases,
                    customDomain,
                    storewideDiscount,
                    basedOnRevision
                });
                lastSentSnapshot.current = currentSnapshot;
                setLastSavedAt(savedAt);
                setStatus('saved');
            } catch {
                setStatus('local-only');
            }
        }, 1400);

        return () => window.clearTimeout(timer);
    }, [basedOnRevision, currentSnapshot, customDomain, enabled, searchAliases, shopKey, storewideDiscount, theme]);

    const clearRecovery = async ({ clearServer = true } = {}) => {
        if (shopKey) window.localStorage.removeItem(`${LOCAL_PREFIX}${shopKey}`);
        lastSentSnapshot.current = '';
        if (clearServer) await API.delete('/store-builder/admin/draft').catch(() => {});
        setStatus('idle');
    };

    return { status, lastSavedAt, localRecovery, clearRecovery };
}
