import { useCallback, useEffect, useRef, useState } from 'react';
import API from '../../../../api/api';

export const useThemeMedia = ({ theme }) => {
    const [temporaryAssets, setTemporaryAssets] = useState({});
    const assetsRef = useRef(temporaryAssets);
    const themeRef = useRef(theme);

    useEffect(() => {
        assetsRef.current = temporaryAssets;
    }, [temporaryAssets]);

    useEffect(() => {
        themeRef.current = theme;
    }, [theme]);

    const rememberTemporaryAsset = useCallback((asset = {}) => {
        if (!asset.url || !asset.assetId) return;
        setTemporaryAssets(previous => ({
            ...previous,
            [asset.url]: String(asset.assetId)
        }));
    }, []);

    const discardTemporaryAsset = useCallback(async (url) => {
        const assetId = assetsRef.current[url];
        if (!assetId) return;

        const serializedTheme = JSON.stringify(themeRef.current || {});
        const occurrences = serializedTheme.split(JSON.stringify(url)).length - 1;
        if (occurrences > 1) return;

        setTemporaryAssets(previous => {
            const next = { ...previous };
            delete next[url];
            return next;
        });
        await API.delete(`/store-builder/admin/assets/${assetId}`).catch(() => {});
    }, []);

    const clearTemporaryAssets = useCallback(() => {
        setTemporaryAssets({});
    }, []);

    return {
        rememberTemporaryAsset,
        discardTemporaryAsset,
        clearTemporaryAssets
    };
};
