import { useCallback, useEffect, useRef, useState } from 'react';

// View navigation only. Theme state, undo and publication stay in StoreBuilderPage.
export function useMobileWorkspace() {
    const [workspace, setWorkspace] = useState('structure');
    const frame = useRef(null);
    useEffect(() => () => cancelAnimationFrame(frame.current), []);
    const selectWorkspace = useCallback(next => {
        if (!['structure', 'preview', 'edit'].includes(next)) return;
        setWorkspace(next);
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            if (!window.matchMedia('(max-width: 1279px)').matches) return;
            const panel = document.getElementById(`builder-workspace-${next}`);
            panel?.focus({ preventScroll: true });
            panel?.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
    }, []);
    return [workspace, selectWorkspace];
}
