"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import API from '@/api/api';
import { createStorefrontRevisionCheck } from '@/lib/storefrontRevisionCheck';

export default function StorefrontRevisionWatcher({ subdomain, shopId, revision }) {
    const router = useRouter();
    const pathname = usePathname();
    useEffect(() => {
        const controller = new AbortController();
        const watcher = createStorefrontRevisionCheck({
            shopId, revision,
            read: async () => (await API.get(`/storefront/${encodeURIComponent(subdomain)}/theme-revision`, {
                signal: controller.signal, timeout: 8000,
            })).data,
            refresh: () => router.refresh(),
            visible: () => document.visibilityState === 'visible',
        });
        const check = () => { watcher.check(); };
        check();
        const timer = window.setInterval(check, 30000);
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', check);
        return () => {
            watcher.close(); controller.abort(); window.clearInterval(timer);
            window.removeEventListener('focus', check);
            document.removeEventListener('visibilitychange', check);
        };
    }, [pathname, revision, router, shopId, subdomain]);
    return null;
}
