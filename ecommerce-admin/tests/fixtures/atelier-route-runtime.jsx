/* eslint-disable react-refresh/only-export-components -- Test-only adapters deliberately export providers, hooks and mocks together. */
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { fixtureProducts, fixtureReviews, fixtureCustomer, fixtureOrder } from './atelier-route-data.js';
const Environment = createContext({
  theme: {},
  tenant: 'atelier-test-a',
  query: '',
  scenario: 'normal',
  user: null
});
let active = {};
export const calls = [];
const apiListeners = new Set();
let lastOrderKey = '';
const failedOrderKeys = new Set();
const record = entry => {
  calls.push(entry);
  apiListeners.forEach(fn => fn());
};
export function FixtureRequests() {
  useSyncExternalStore(fn => {
    apiListeners.add(fn);
    return () => apiListeners.delete(fn);
  }, () => calls.length, () => 0);
  return <details className="fixture-toolbar"><summary>Mock API activity (no sensitive values)</summary><pre aria-label="Mock API activity">{JSON.stringify(calls.slice(-12), null, 2)}</pre></details>;
}
export const setFixtureEnvironment = value => {
  active = value;
};
export const headers = async () => new Map([['host', (active.tenant || 'atelier-test-a') + '.localhost']]);
export const fetchStorefrontInfo = async subdomain => ({
  _id: 'eeeeeeeeeeeeeeeeeeeeeee1',
  shopName: 'Fixture merchant',
  subdomain,
  theme: active.theme || {}
});
export const getStorefrontPlanRedirectUrl = () => '';
export const notFound = () => {
  throw new Error('NEXT_NOT_FOUND');
};
export const redirect = href => {
  throw new Error('NEXT_REDIRECT:' + href);
};
let notices = [];
const listeners = new Set();
const notify = text => {
  notices = [...notices.slice(-2), String(text)];
  listeners.forEach(fn => fn());
};
export const toast = {
  success: notify,
  error: notify
};
export function FixtureNotices() {
  const items = useSyncExternalStore(fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, () => notices, () => notices);
  return <div role="status" className="fixture-notices">{items.map((x, i) => <p key={i}>{x}</p>)}</div>;
}
export function FixtureEnvironment({
  value,
  children
}) {
  useEffect(() => {
    active = value;
  }, [value]);
  return <Environment.Provider value={value}>{children}</Environment.Provider>;
}
export function useStorefrontTheme() {
  return {
    theme: useContext(Environment).theme
  };
}
export function useParams() {
  return {
    subdomain: useContext(Environment).tenant
  };
}
export function usePathname() {
  return useContext(Environment).path || '/categories/objects';
}
export function useSearchParams() {
  return new URLSearchParams(useContext(Environment).query);
}
export function useRouter() {
  const e = useContext(Environment);
  return {
    push: href => e.onNavigate?.(href),
    replace: href => e.onNavigate?.(href),
    refresh: () => {}
  };
}
export function useAuth() {
  const e = useContext(Environment);
  return {
    user: e.user || null,
    loading: false,
    login: async () => {
      e.onUser?.(fixtureCustomer);
      return {
        success: true,
        user: fixtureCustomer
      };
    },
    logout: async () => e.onUser?.(null),
    checkAuthStatus: async () => {}
  };
}
export function FixtureLink({
  href,
  prefetch,
  children,
  onClick,
  ...props
}) {
  void prefetch;
  const e = useContext(Environment);
  return <a href={typeof href === 'string' ? href : '#'} {...props} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented) e.onNavigate?.(href);
    event.preventDefault();
  }}>{children}</a>;
}
export function FixtureImage({
  fill,
  priority,
  unoptimized,
  quality,
  ...props
}) {
  void unoptimized;
  void quality;
  return <img {...props} loading={priority ? 'eager' : 'lazy'} style={{
    ...(fill ? {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%'
    } : {}),
    ...props.style
  }} />;
}
const response = data => ({
  data
});
const failure = message => Promise.reject(Object.assign(new Error(message), {
  response: {
    data: {
      error: message,
      message
    },
    status: 400
  }
}));
export const API = {
  async get(url, config) {
    record({
      method: 'GET',
      url,
      headers: Object.keys(config?.headers || {})
    });
    await Promise.resolve();
    if (url.includes('/track-order/')) {
      if (config?.headers?.['x-order-access-token'] !== 'fixture-order-access') return failure('Verify order access first');
      return response({
        ...fixtureOrder,
        subtotal: 1080,
        shippingCost: 80,
        totalAmount: 1160,
        shippingZone: 'Inside Dhaka',
        shippingAddress: {
          ...fixtureOrder.shippingAddress,
          addressLine: 'Synthetic test address'
        },
        items: fixtureOrder.items.map(item => ({
          ...item,
          total: 1080,
          sku: 'MCH-NAT'
        })),
        status: 'Pending',
        timeline: [{
          type: 'Pending',
          message: 'Synthetic pending event',
          createdAt: fixtureOrder.createdAt
        }],
        ...(active.scenario === 'delivered' ? {
          status: 'Delivered',
          canCancel: false,
          returnEligibility: {
            canRequestReturn: true
          }
        } : {})
      });
    }
    if (url.includes('/recommendations/cart')) return response({
      data: fixtureProducts.filter(p => !String(config?.params?.ids || '').split(',').includes(p._id))
    });
    if (url.endsWith('/reviews')) return response({
      data: fixtureReviews
    });
    if (url.endsWith('/products/batch')) return response({
      data: fixtureProducts
    });
    if (url.endsWith('/products')) return response({
      data: fixtureProducts
    });
    if (url.includes('/products/')) {
      if (active.scenario === 'loading') return new Promise(() => {});
      if (active.scenario === 'missing') return failure('Product not found');
      return response(fixtureProducts.find(p => url.endsWith('/' + p.slug) || url.endsWith('/' + p._id)) || fixtureProducts[0]);
    }
    if (url.endsWith('/my-orders') || url.endsWith('/orders')) return response({
      data: [fixtureOrder],
      orders: [fixtureOrder]
    });
    throw new Error('Unmocked GET blocked: ' + url);
  },
  async post(url, payload, config) {
    record({
      method: 'POST',
      url,
      fields: payload instanceof FormData ? Array.from(payload.keys()) : Object.keys(payload || {}),
      headers: Object.keys(config?.headers || {}),
      ...(url === '/public/orders' || url.endsWith('/orders') ? {
        phoneProofPresent: !!payload.phoneVerificationToken,
        idempotencyPresent: !!payload.idempotencyKey,
        retryKeySameAsPrevious: lastOrderKey === payload.idempotencyKey,
        policyAccepted: payload.consent?.checkoutPolicyAccepted,
        marketingOptIn: payload.consent?.marketingEmailOptIn
      } : {})
    });
    if (url === '/public/orders' || url.endsWith('/orders')) lastOrderKey = payload.idempotencyKey;
    if (active.scenario === 'busy' && url.includes('/checkout/')) return new Promise(() => {});
    if (active.scenario === 'otp-error' && url.includes('verify')) return failure('Fixture: invalid or expired code');
    if (url.includes('/access/send-otp')) return response({
      maskedPhone: '017****0000',
      message: 'Fixture access code available'
    });
    if (url.includes('/access/verify-otp')) return response({
      accessToken: 'fixture-order-access'
    });
    if (url.includes('/checkout/send-otp')) return response({
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
      maskedPhone: '017****0000'
    });
    if (url.includes('/checkout/verify-otp')) return response({
      phoneVerificationToken: 'fixture-phone-proof',
      expiresAt: new Date(Date.now() + 600000).toISOString()
    });
    if (url.includes('/validate')) return payload.code === 'INVALID' ? failure('Fixture: invalid coupon') : response({
      data: {
        discountAmount: 100,
        freeShipping: false
      }
    });
    if (url.endsWith('/reviews')) return response({
      message: 'Fixture review accepted'
    });
    if (url.endsWith('/cancel') || url.endsWith('/returns')) return response({
      message: 'Fixture request accepted'
    });
    if (url === '/public/orders' || url.endsWith('/orders')) {
      if (active.scenario === 'order-error' && !failedOrderKeys.has(payload.idempotencyKey)) {
        failedOrderKeys.add(payload.idempotencyKey);
        return failure('Fixture order rejected once');
      }
      return response({
        success: true,
        order: fixtureOrder,
        data: fixtureOrder,
        orderId: fixtureOrder._id
      });
    }
    if (url.includes('/auth/')) return response({
      success: true,
      message: 'Fixture account request accepted',
      resetToken: 'fixture-reset-token'
    });
    throw new Error('Unmocked POST blocked: ' + url);
  },
  async put(url, payload) {
    record({
      method: 'PUT',
      url,
      fields: Object.keys(payload || {})
    });
    if (url === '/auth/update-password') return response({
      message: 'Fixture password updated'
    });
    throw new Error('Unmocked PUT blocked: ' + url);
  }
};
export default API;
export const trackStorefrontEvent = () => {};
export const getAnalyticsConsent = () => typeof localStorage === 'undefined' ? null : localStorage.getItem('atelier-fixture-consent') || 'unknown';
export const setAnalyticsConsent = value => {
  localStorage.setItem('atelier-fixture-consent', value);
  window.dispatchEvent(new Event('scaleup-analytics-consent-changed'));
};
