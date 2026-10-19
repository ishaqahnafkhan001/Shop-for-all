import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getAiAccess, aiErrorMessage } from '../utils/aiAccess.js';
import { useAuth } from '../context/AuthContext.jsx';
import { aiSnapshot, createAiOperationState } from '../utils/aiOperationState.js';

export function useAiOperation({ feature, entity, input }) {
    const { user, setUser } = useAuth();
    const access = getAiAccess(user, feature);
    const tenant = user?.shop?._id || user?.shop_id?._id || user?.shop_id || user?.shopId || user?.tenantId || user?._id || '';
    const key = aiSnapshot({ tenant, entity, input });
    const latest = useRef({ key, tenant });
    useLayoutEffect(() => { latest.current = { key, tenant }; }, [key, tenant]);
    const machine = useRef(null);
    if (machine.current === null) machine.current = createAiOperationState();
    const mounted = useRef(true);
    const executor = useRef(null);
    const [status, setStatus] = useState({ state: 'idle', error: '', meta: null });
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; machine.current.cancel(); };
    }, []);
    useEffect(() => {
        if (!machine.current.canRetry(key) && !machine.current.canApply(key)) {
            machine.current.cancel();
            setStatus(previous => previous.state === 'idle' ? previous : { ...previous, state: 'stale', error: 'Inputs changed. Generate again before applying.' });
        }
    }, [key]);

    const run = useCallback(async (execute, { retry = false } = {}) => {
        const captured = latest.current;
        const operation = machine.current.begin(feature, captured.key, retry);
        executor.current = execute;
        setStatus({ state: 'loading', error: '', meta: null });
        try {
            const response = await execute({ headers: { 'x-ai-request-id': operation.id }, signal: operation.controller.signal });
            const payload = response?.data || {};
            if (mounted.current && latest.current.tenant === captured.tenant && machine.current.accepts(operation, latest.current.key) && payload.usage) {
                setUser(current => current ? { ...current, planAccess: { ...current.planAccess,
                    usage: { ...current.planAccess?.usage, ai: payload.usage } } } : current);
            }
            if (!machine.current.finish(operation, latest.current.key) || !mounted.current) return null;
            if (payload.success === false) throw Object.assign(new Error(payload.message || payload.error || 'Suggestions could not be generated.'), { response });
            setStatus({ state: 'ready', error: '', meta: payload.meta || payload.data?.meta || null });
            return response;
        } catch (error) {
            if (!mounted.current || !machine.current.accepts(operation, latest.current.key)) return null;
            const payload = error.response?.data || {};
            if (payload.usage && latest.current.tenant === captured.tenant) {
                setUser(current => current ? { ...current, planAccess: { ...current.planAccess,
                    usage: { ...current.planAccess?.usage, ai: payload.usage } } } : current);
            }
            const retryable = !error.response || error.response.status >= 500 || payload.code === 'AI_REQUEST_IN_PROGRESS';
            setStatus({ state: retryable ? 'retryable' : 'failed', meta: null,
                error: aiErrorMessage(payload) || error.message || 'Suggestions are unavailable.' });
            return null;
        }
    }, [feature, setUser]);

    const cancel = () => { machine.current.cancel(); setStatus(previous => ({ ...previous, state: 'cancelled', error: 'Cancelled locally. The previous request may still be recovering.' })); };
    return { ...status, access, loading: status.state === 'loading', run, cancel,
        canApply: expectedInput => (expectedInput === undefined || aiSnapshot({ tenant: latest.current.tenant, entity, input: expectedInput }) === latest.current.key) && machine.current.canApply(latest.current.key),
        rebase: nextInput => machine.current.rebase(aiSnapshot({ tenant: latest.current.tenant, entity, input: nextInput })),
        retry: () => executor.current ? run(executor.current, { retry: true }) : Promise.resolve(null) };
}
