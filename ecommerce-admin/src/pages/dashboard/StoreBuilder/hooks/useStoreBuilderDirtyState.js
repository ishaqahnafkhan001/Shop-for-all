import { useMemo } from 'react';
import {
    safeParseSnapshot,
    stableStringify
} from '../storeBuilderThemeUtils.js';

export function useStoreBuilderDirtyState({
    theme,
    searchAliases,
    customDomain,
    storewideDiscount,
    initialSnapshot
}) {
    const currentSnapshot = useMemo(
        () => stableStringify({ theme, searchAliases, customDomain, storewideDiscount: Number(storewideDiscount) || 0 }),
        [theme, searchAliases, customDomain, storewideDiscount]
    );

    const hasUnsavedChanges = Boolean(initialSnapshot) && initialSnapshot !== currentSnapshot;

    const publishedVersionLabel = useMemo(() => {
        if (!initialSnapshot) return 'Not loaded';
        const parsed = safeParseSnapshot(initialSnapshot);
        return parsed?.theme?.version ? `Theme v${parsed.theme.version}` : 'Published theme';
    }, [initialSnapshot]);

    return {
        currentSnapshot,
        hasUnsavedChanges,
        publishedVersionLabel
    };
}
