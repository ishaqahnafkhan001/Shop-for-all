import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import StoreBuilderPage from '../../../../../ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx';

function Fixture() {
    const [writes, setWrites] = useState([]);
    const [diagnostics, setDiagnostics] = useState(null);
    const timings = React.useRef([]);
    const initialReady = React.useRef(null);
    useEffect(() => {
        const handler = event => setWrites(previous => [...previous, event.detail]);
        window.addEventListener('adaptive-fixture-write', handler);
        return () => window.removeEventListener('adaptive-fixture-write', handler);
    }, []);
    useEffect(() => {
        let doc;
        const handler = () => { const start = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => timings.current.push({ type: 'iframe:selection', milliseconds: performance.now() - start }))); };
        const timer = window.setInterval(() => { doc = document.querySelector('iframe')?.contentDocument;
            if (!doc?.querySelector('[data-ab-node]')) return;
            initialReady.current = performance.now(); doc.addEventListener('click', handler, true); window.clearInterval(timer);
        }, 16);
        return () => { window.clearInterval(timer); doc?.removeEventListener('click', handler, true); };
    }, []);
    useEffect(() => {
        const handler = event => { const start = performance.now(); const type = event.type;
            requestAnimationFrame(() => requestAnimationFrame(() => timings.current.push({ type, milliseconds: performance.now() - start }))); };
        document.addEventListener('input', handler, true); document.addEventListener('click', handler, true);
        return () => { document.removeEventListener('input', handler, true); document.removeEventListener('click', handler, true); };
    }, []);
    const capture = () => {
        const frame = document.querySelector('iframe'), doc = frame?.contentDocument;
        const nodes = [...(doc?.querySelectorAll('[data-ab-node]') || [])].map(element => { const style = frame.contentWindow.getComputedStyle(element); return { id: element.dataset.abNode, fontSize: style.fontSize, color: style.color, width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth }; });
        setDiagnostics({ viewport: innerWidth, width: document.documentElement.scrollWidth, iframeWidth: doc?.documentElement.clientWidth,
            iframeScrollWidth: doc?.documentElement.scrollWidth, nodes, timings: timings.current.slice(-30), initialReadyMs: initialReady.current,
            unknownRecoveryPreserved: localStorage.getItem('scaleup:store-builder:draft:d11111111111111111111111')?.includes('preserve-me'), sinceNavigationMs: performance.now() });
    };
    return <><StoreBuilderPage /><Toaster /><output id="fixture-writes" aria-live="polite">Synthetic writes only: {writes.join(', ') || 'none'}</output>
        <details><summary>Isolated fixture diagnostics</summary><button type="button" onClick={capture}>Capture fixture diagnostics</button><output id="fixture-diagnostics" style={{ display: 'block', maxWidth: '100%', overflowWrap: 'anywhere' }}>{JSON.stringify(diagnostics)}</output>
            <button type="button" onClick={() => window.dispatchEvent(new Event('adaptive-fixture-conflict'))}>Simulate another draft writer</button>
            <button type="button" onClick={() => localStorage.setItem('scaleup:store-builder:draft:d11111111111111111111111', JSON.stringify({ formatVersion: 99, sentinel: 'preserve-me' }))}>Seed incompatible synthetic recovery</button>
        </details></>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
