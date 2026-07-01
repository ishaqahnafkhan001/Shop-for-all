import { useCallback, useEffect, useRef } from 'react';

export const isAbortError = (error) => (
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED'
);

export const useAbortableRequest = () => {
    const controllerRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => () => {
        controllerRef.current?.abort();
    }, []);

    return useCallback(async (requestFn) => {
        controllerRef.current?.abort();

        const controller = new AbortController();
        controllerRef.current = controller;
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        const isLatest = () => requestId === requestIdRef.current && !controller.signal.aborted;

        try {
            return await requestFn({ signal: controller.signal, isLatest });
        } catch (error) {
            if (isAbortError(error)) return undefined;
            throw error;
        } finally {
            if (controllerRef.current === controller) {
                controllerRef.current = null;
            }
        }
    }, []);
};

export default useAbortableRequest;
