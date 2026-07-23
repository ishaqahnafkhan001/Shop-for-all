import { useCallback, useEffect, useState } from 'react';

import API from '../../../../api/api.js';

export function useStoreBuilderBootstrap() {
    const [state, setState] = useState({ loading: true, data: null, error: '' });

    const reload = useCallback(async ({ keepCurrent = false } = {}) => {
        setState(prev => ({ ...prev, loading: !keepCurrent, error: '' }));
        try {
            const response = await API.get('/store-builder/admin/bootstrap');
            const payload = response.data?.bootstrap || null;
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
