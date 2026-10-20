import { useEffect, useRef, useState } from 'react';

export const useProductImagePreviews = files => {
    const [previews, setPreviews] = useState([]);
    const urls = useRef(new Map());
    useEffect(() => {
        let active = true;
        const retained = new Set(files);
        for (const [file, url] of urls.current) if (!retained.has(file)) {
            URL.revokeObjectURL(url);
            urls.current.delete(file);
        }
        const next = files.map(file => {
            if (!urls.current.has(file)) urls.current.set(file, URL.createObjectURL(file));
            return { file, url: urls.current.get(file) };
        });
        queueMicrotask(() => { if (active) setPreviews(next); });
        return () => { active = false; };
    }, [files]);
    useEffect(() => {
        const cache = urls.current;
        return () => { cache.forEach(url => URL.revokeObjectURL(url)); cache.clear(); };
    }, []);
    // Remove stale entries from the rendered list before their effect revokes them.
    return files.map(file => previews.find(preview => preview.file === file)).filter(Boolean);
};
