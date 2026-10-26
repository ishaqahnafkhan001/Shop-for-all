"use client";

import { useEffect, useState } from 'react';
import API from '@/api/api';

export function useDeliveryQuote({ subdomain, district }) {
    const [settings, setSettings] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        API.get(`/storefront/${subdomain}/shipping/rates`, { signal: controller.signal })
            .then(({ data }) => { setSettings(data.data); setError(''); })
            .catch(() => { if (!controller.signal.aborted) setError('Delivery settings could not be loaded. Please retry.'); });
        return () => controller.abort();
    }, [subdomain, revision]);
    useEffect(() => {
        if (!district) return;
        const controller = new AbortController();
        API.get(`/storefront/${subdomain}/shipping/quote`, { params: { district }, signal: controller.signal })
            .then(({ data }) => { setResult({ ...data.data, shop: subdomain, revision, validUntil: Date.now() + 14 * 60000 }); setError(''); })
            .catch(error => { if (!controller.signal.aborted) setError(error.response?.data?.error || 'Delivery charge could not be calculated. Please retry.'); });
        return () => controller.abort();
    }, [subdomain, district, revision]);
    // Expire on screen before the server's 15 minute deadline.
    useEffect(() => {
        if (!result) return;
        const timer = setTimeout(() => setRevision(value => value + 1), Math.max(0, result.validUntil - Date.now()));
        return () => clearTimeout(timer);
    }, [result]);
    const quote = result?.shop === subdomain && result?.district === district && result?.revision === revision ? result : null;
    return { settings, quote, error, refresh: () => { setError(''); setRevision(value => value + 1); } };
}
