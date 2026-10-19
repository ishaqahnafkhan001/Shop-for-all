import { createAiRequestId } from './aiRequestId.js';

const files = new WeakMap();
let fileNumber = 0;
export function aiSnapshot(value) {
    const canonical = item => {
        if (typeof Blob !== 'undefined' && item instanceof Blob) {
            if (!files.has(item)) files.set(item, ++fileNumber);
            return { file: files.get(item), size: item.size, type: item.type };
        }
        if (Array.isArray(item)) return item.map(canonical);
        if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map(key => [key, canonical(item[key])]));
        return typeof item === 'string' ? item.normalize('NFC') : item;
    };
    return JSON.stringify(canonical(value));
}

export function createAiOperationState() {
    let active, acceptedKey, previous;
    return {
        begin(feature, key, retry = false) {
            if (retry && (!previous || previous.key !== key)) throw new Error('Inputs changed. Generate a new suggestion.');
            active?.controller.abort();
            const operation = { id: retry ? previous.id : createAiRequestId(feature), key, controller: new AbortController() };
            active = operation;
            previous = operation;
            acceptedKey = null;
            return operation;
        },
        accepts(operation, key) { return active === operation && operation.key === key && !operation.controller.signal.aborted; },
        finish(operation, key) {
            if (!this.accepts(operation, key)) return false;
            acceptedKey = key;
            return true;
        },
        canApply(key) { return Boolean(acceptedKey && acceptedKey === key); },
        rebase(key) { acceptedKey = key; },
        cancel() { active?.controller.abort(); active = null; acceptedKey = null; },
        canRetry(key) { return previous?.key === key; }
    };
}

const readPath = (value, path) => path.reduce((item, key) => item?.[key], value);
const writePath = (value, [key, ...rest], next) => ({ ...value, [key]: rest.length ? writePath(value?.[key], rest, next) : next });
export function createAiPatch(before, after, path = []) {
    if (aiSnapshot(before) === aiSnapshot(after)) return [];
    if (before && after && !Array.isArray(before) && !Array.isArray(after) && typeof before === 'object' && typeof after === 'object') {
        return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => createAiPatch(before[key], after[key], [...path, key]));
    }
    return [{ path, before, after }];
}
export function undoAiPatch(current, patch) {
    let value = current, conflicts = 0;
    for (const change of patch) {
        if (aiSnapshot(readPath(value, change.path)) !== aiSnapshot(change.after)) { conflicts++; continue; }
        value = writePath(value, change.path, change.before);
    }
    return { value, conflicts };
}
