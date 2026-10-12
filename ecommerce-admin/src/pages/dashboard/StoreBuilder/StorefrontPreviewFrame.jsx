import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// A real document viewport gives Tailwind media queries, fixed bars and sticky
// elements the same containing viewport as the live store. Only the outer frame
// is scaled to fit the editor. The iframe cannot execute document scripts.
export function StorefrontPreviewFrame({ width, height = 800, title, zoom = 'fit', thumbnail = false, children }) {
    const host = useRef(null);
    const frame = useRef(null);
    const [mount, setMount] = useState(null);
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const resize = () => setScale(zoom === 'fit' ? Math.min(1, Math.max(0.05, (host.current?.clientWidth || width) / width)) : Number(zoom) || 1);
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(host.current);
        return () => observer.disconnect();
    }, [width, zoom]);
    useEffect(() => {
        if (!mount) return;
        const document = mount.ownerDocument;
        const sync = () => {
            document.head.querySelectorAll('[data-preview-style]').forEach(node => node.remove());
            host.current.ownerDocument.querySelectorAll('link[rel="stylesheet"], style').forEach(source => {
                const copy = source.cloneNode(true);
                if (source.tagName === 'LINK') copy.href = source.href;
                copy.setAttribute('data-preview-style', '');
                document.head.appendChild(copy);
            });
        };
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(host.current.ownerDocument.head, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, [mount]);
    return <div ref={host} className="w-full overflow-hidden" data-preview-viewport={width}>
        <div className="relative mx-auto" style={{ width: width * scale, height: height * scale }}>
            <iframe ref={frame} title={title} sandbox="allow-same-origin" tabIndex={thumbnail ? -1 : 0}
                srcDoc={'<!doctype html><html lang="en"><head></head><body style="margin:0;min-width:0"><div id="storefront-preview-root"></div></body></html>'}
                onLoad={() => setMount(frame.current?.contentDocument?.getElementById('storefront-preview-root') || null)}
                className="absolute left-0 top-0 border-0 bg-white"
                style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: thumbnail ? 'none' : undefined }} />
            {mount && createPortal(children, mount)}
        </div>
    </div>;
}
