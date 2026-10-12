// This requests an authoritative RSC refresh; it never applies client theme data.
export function createStorefrontRevisionCheck({ shopId, revision, read, refresh, visible = () => true }) {
    let active = true;
    let checking = false;
    return {
        async check() {
            if (!active || checking || !visible()) return;
            checking = true;
            try {
                const next = await read();
                if (!active || String(next?.shopId) !== String(shopId)) return;
                if (Number.isSafeInteger(next.themeRevision) && next.themeRevision > revision) refresh();
            } catch { /* Keep the rendered snapshot on transient failures. */ }
            finally { checking = false; }
        },
        close() { active = false; },
    };
}
