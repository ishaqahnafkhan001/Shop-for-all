// One queue owns autosave, explicit save, discard and the publication barrier.
export function createDraftWriteQueue({ save, remove, initialVersion = null }) {
    let tail = Promise.resolve();
    let version = initialVersion;
    let generation = 0;
    let paused = false;
    let closed = false;
    const enqueue = task => {
        const result = tail.then(task);
        tail = result.catch(() => {});
        return result;
    };
    return {
        save(payload) {
            const epoch = generation;
            return enqueue(async () => {
                if (closed || paused || epoch !== generation) return null;
                const result = await save({ ...payload, expectedDraftUpdatedAt: version });
                version = result.updatedAt;
                return result;
            });
        },
        async pause() { paused = true; generation += 1; await tail; },
        resume() { if (!closed) paused = false; },
        resetVersion(next) { version = next ?? null; },
        async clear({ clearServer = true } = {}) {
            generation += 1;
            return enqueue(async () => {
                if (closed) return;
                if (clearServer) await remove(version);
                version = null;
            });
        },
        close() { closed = true; generation += 1; },
    };
}
