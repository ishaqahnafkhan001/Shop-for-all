import { useCallback, useEffect, useState } from 'react';

import API from '../../../../api/api.js';

export function useStoreBuilderBootstrap() {
    const [state, setState] = useState({ loading: true, data: null, error: '' });

    const reload = useCallback(async ({ keepCurrent = false } = {}) => {
        setState(prev => ({ ...prev, loading: !keepCurrent, error: '' }));
        try {
            const response = await API.get('/store-builder/admin');
            const legacyData = response.data?.data || null;
            const payload = response.data?.bootstrap || (legacyData ? {
                shop: legacyData.shop || legacyData,
                products: legacyData.products || [],
                categories: legacyData.categories || [],
                categoryDetails: legacyData.categoryDetails || [],
                collections: legacyData.collections || [],
                reviews: legacyData.reviews || [],
                seoStats: legacyData.seoStats || null,
                draft: legacyData.draft || null,
                revisions: legacyData.revisions || [],
                publication: legacyData.publication || null,
                planAccess: response.data?.planAccess || legacyData.planAccess || null,
                compatibilityMode: true
            } : null);
            if (!payload?.shop) throw new Error('Store Builder bootstrap did not include shop settings.');
            setState({ loading: false, data: payload, error: '' });
            return payload;
        } catch (error) {
            setState(prev => ({
                loading: false,
                data: keepCurrent ? prev.data : null,
                error: error.response?.data?.error || error.message || 'Failed to load Store Builder'
            }));
            throw error;
        }
    }, []);

    useEffect(() => {
        reload().catch(() => {});
    }, [reload]);

    return { ...state, reload };
}
