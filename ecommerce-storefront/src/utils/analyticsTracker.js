"use client";

import API from '@/api/api';

const SESSION_KEY = 'scaleup_analytics_session_id';

const getCurrentSubdomain = () => {
    if (typeof window === 'undefined') return '';

    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('.localhost')) {
        const localSubdomain = hostname.split('.localhost')[0];
        return localSubdomain && localSubdomain !== 'localhost' ? localSubdomain : '';
    }

    if (hostname.endsWith('.scaleup.codes')) {
        const [subdomain] = hostname.split('.');
        return ['www', 'api', 'admin'].includes(subdomain) ? '' : subdomain;
    }

    return '';
};

const getSessionId = () => {
    if (typeof window === 'undefined') return '';

    try {
        const existing = window.localStorage.getItem(SESSION_KEY);
        if (existing) return existing;

        const next = window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        window.localStorage.setItem(SESSION_KEY, next);
        return next;
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
};

const getUtm = () => {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    return {
        source: params.get('utm_source') || '',
        medium: params.get('utm_medium') || '',
        campaign: params.get('utm_campaign') || '',
        content: params.get('utm_content') || '',
        term: params.get('utm_term') || ''
    };
};

const getDevice = () => {
    if (typeof window === 'undefined') return {};

    const userAgent = window.navigator.userAgent || '';
    const width = window.innerWidth || 0;
    const type = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
    const browser = userAgent.includes('Chrome')
        ? 'Chrome'
        : userAgent.includes('Safari')
            ? 'Safari'
            : userAgent.includes('Firefox')
                ? 'Firefox'
                : 'Other';
    const os = userAgent.includes('Mac')
        ? 'macOS'
        : userAgent.includes('Windows')
            ? 'Windows'
            : userAgent.includes('Android')
                ? 'Android'
                : /iPhone|iPad|iPod/.test(userAgent)
                    ? 'iOS'
                    : 'Other';

    return { type, browser, os };
};

export const getAnalyticsSessionId = getSessionId;

export const trackStorefrontEvent = async (event) => {
    if (typeof window === 'undefined' || !event?.eventType) return;

    try {
        await API.post('/analytics/event', {
            subdomain: event.subdomain || getCurrentSubdomain(),
            sessionId: event.sessionId || getSessionId(),
            currency: 'BDT',
            pageUrl: window.location.href,
            referrer: document.referrer || '',
            utm: getUtm(),
            device: getDevice(),
            ...event
        });
    } catch {
        // Analytics must never interrupt browsing, cart, or checkout.
    }
};
