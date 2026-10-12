import { useState } from 'react';
import toast from 'react-hot-toast';
import { createAiPatch, undoAiPatch } from '../utils/aiOperationState.js';

export function useAiUndo(entity, value, setValue) {
    const [saved, setPatch] = useState(null);
    const patch = saved?.entity === entity ? saved.patch : null;
    const record = (before, after) => setPatch({ entity, patch: createAiPatch(before, after) });
    const undo = () => {
        if (!patch) return;
        const result = undoAiPatch(value, patch);
        setValue(result.value);
        setPatch(null);
        toast.success(result.conflicts ? 'Restored unchanged AI fields. Your later edits were kept.' : 'Last AI apply undone.');
    };
    return { record, clear: () => setPatch(null), undo: patch?.length ? undo : null };
}
