const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  pathToFileURL
} = require('node:url');
const {
  loadRoutes,
  root
} = require('./helpers/atelier-routes.cjs');
const {
  getPrebuiltThemes,
  resolvePrebuiltTheme
} = require('@scaleup/storefront-theme/prebuilt');
let h, prices;
test.before(async () => {
  h = await loadRoutes();
  prices = await import(pathToFileURL(path.join(root, 'packages/storefront-renderer/normalizeProduct.js')));
});
// Controlled React hook runner: executes actual hooks/effects and cleanup, with no DOM.
// This does not replace browser or real database integration acceptance.
function hooks(t, context) {
  const slots = [];
  let cursor = 0;
  let pending = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  t.mock.method(h.React, 'useState', initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = {
      value: typeof initial === 'function' ? initial() : initial
    };
    return [slots[index].value, next => {
      slots[index].value = typeof next === 'function' ? next(slots[index].value) : next;
    }];
  });
  t.mock.method(h.React, 'useRef', initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = {
      current: initial
    };
    return slots[index];
  });
  t.mock.method(h.React, 'useMemo', (fn, deps) => {
    const index = cursor++;
    if (!same(slots[index]?.deps, deps)) slots[index] = {
      value: fn(),
      deps
    };
    return slots[index].value;
  });
  t.mock.method(h.React, 'useCallback', fn => fn);
  t.mock.method(h.React, 'useEffect', (fn, deps) => {
    const index = cursor++;
    if (!same(slots[index]?.deps, deps)) pending.push(() => {
      slots[index]?.cleanup?.();
      slots[index] = {
        deps,
        cleanup: fn()
      };
    });
  });
  if (context) t.mock.method(h.React, 'useContext', context);
  t.mock.method(h.React, 'use', value => value);
  return {
    render(fn) {
      cursor = 0;
      const value = fn();
      const effects = pending;
      pending = [];
      effects.forEach(fn => fn());
      return value;
    },
    unmount() {
      slots.forEach(slot => slot.cleanup?.());
    }
  };
}
const fixture = override => ({
  _id: 'aaaaaaaaaaaaaaaaaaaaaaa1',
  title: 'Test item',
  sellingPrice: 1200,
  pricing: {
    sellingPrice: 1200,
    buyingPrice: 10,
    discount: 10
  },
  discount: 10,
  variants: [{
    _id: 'bbbbbbbbbbbbbbbbbbbbbbb1',
    isActive: true,
    status: 'active',
    attributes: [],
    stock: 5,
    ...(override === undefined ? {} : {
      pricing: {
        price: override
      }
    })
  }]
});
function globalValue(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true
  });
  t.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
}
const walk = (node, fn) => {
  if (Array.isArray(node)) return node.forEach(n => walk(n, fn));
  if (!node || typeof node !== 'object') return;
  fn(node);
  walk(node.props?.children, fn);
};
const find = (node, predicate) => {
  let found;
  walk(node, n => {
    if (predicate(n)) found = n;
  });
  assert.ok(found, 'Expected rendered control');
  return found;
};
for (const [label, input, expected] of [['base only', {}, 1200], ['missing override', {
  cartPrice: undefined,
  finalPrice: 1080
}, 1080], ['zero snapshot', {
  cartPrice: 0,
  finalPrice: 1080
}, 0], ['zero final', {
  finalPrice: 0
}, 0], ['positive override', {
  cartPrice: 25
}, 25], ['zero base', {
  sellingPrice: 0
}, 0], ['null', {
  cartPrice: null,
  finalPrice: 1080
}, 1080], ['empty', {
  cartPrice: '  ',
  finalPrice: 1080
}, 1080], ['invalid', {
  cartPrice: 'broken',
  finalPrice: 1080
}, 1080], ['negative', {
  cartPrice: -1,
  finalPrice: 1080
}, 1080], ['infinite', {
  cartPrice: Infinity,
  finalPrice: 1080
}, 1080], ['boolean', {
  cartPrice: false,
  finalPrice: 1080
}, 1080], ['numeric string', {
  cartPrice: '0'
}, 0], ['missing all', {
  sellingPrice: undefined
}, 0]]) test('cart price: ' + label, () => assert.equal(prices.getCartItemPrice({
  sellingPrice: 1200,
  ...input
}), expected));
for (const [override, expected] of [[undefined, 1080], [null, 1080], [0, 0], [200, 180], ['', 1080], ['invalid', 1080]]) test('detail and refresh agree for override ' + String(override), () => {
  const product = fixture(override);
  const detail = prices.getProductPresentation(prices.normalizeProduct(product));
  assert.equal(detail.displayFinalPrice, expected);
  const item = {
    _id: product._id,
    variantId: product.variants[0]._id,
    cartPrice: 777,
    quantity: 2
  };
  const refreshed = prices.refreshCartItemPrice(item, product);
  assert.equal(prices.getCartItemPrice(refreshed), expected);
  assert.equal(refreshed.quantity, 2);
  assert.equal(prices.refreshCartItemPrice(item, {
    ...product,
    _id: 'foreign-product'
  }), item);
  assert.equal(prices.refreshCartItemPrice({
    ...item,
    variantId: 'foreign-variant'
  }, product).cartPrice, 777);
});
test('scheduled sale and zero base remain zero; normal scheduled discounts stay intact', () => {
  const product = fixture(200);
  product.scheduledSale = {
    discountType: 'fixed',
    discountValue: 20
  };
  assert.equal(prices.getProductPresentation(prices.normalizeProduct(product)).displayFinalPrice, 160);
  product.variants[0].pricing.price = 0;
  assert.equal(prices.getProductPresentation(prices.normalizeProduct(product)).displayFinalPrice, 0);
  assert.equal(prices.getProductPresentation(prices.normalizeProduct({
    ...fixture(),
    sellingPrice: 0,
    pricing: {
      sellingPrice: 0
    }
  })).displayFinalPrice, 0);
});
test('actual cart: quantity, mixed totals, persistence, reload and mounted tenant change preserve free item', async t => {
  const store = new Map();
  globalValue(t, 'localStorage', {
    getItem: key => store.get(key) || null,
    setItem: (key, value) => store.set(key, value)
  });
  const runtime = hooks(t);
  let tenant = 'tenant-a';
  const view = () => runtime.render(() => h.ui.CartProvider({
    subdomain: tenant
  })).props.value;
  view();
  await Promise.resolve();
  let cart = view();
  cart.addToCart({
    _id: 'p',
    variantId: 'free',
    title: 'Free',
    sellingPrice: 1200,
    cartPrice: 0,
    finalPrice: 0
  }, 2);
  cart = view();
  cart.addToCart({
    _id: 'p',
    variantId: 'paid',
    title: 'Paid',
    sellingPrice: 100,
    cartPrice: 90
  }, 3);
  cart = view();
  assert.equal(cart.cartTotal, 270);
  assert.equal(cart.cartItems.length, 2);
  cart.updateQuantity('p:free', 5);
  cart = view();
  assert.equal(cart.cartTotal, 270);
  assert.equal(cart.cartCount, 8);
  assert.equal(JSON.parse(store.get('shopforall_cart_tenant-a'))[0].cartPrice, 0);
  tenant = 'tenant-b';
  assert.equal(view().cartItems.length, 0);
  await Promise.resolve();
  assert.equal(view().cartTotal, 0);
  assert.equal(JSON.parse(store.get('shopforall_cart_tenant-b')).length, 0);
  tenant = 'tenant-a';
  view();
  await Promise.resolve();
  cart = view();
  assert.equal(cart.cartTotal, 270);
  assert.equal(cart.cartItems[0].quantity, 5);
  runtime.unmount();
});
test('product actions put selected zero override into cart and retain sale calculation', t => {
  const added = [];
  const runtime = hooks(t, ctx => ctx._currentValue || {
    addToCart: p => added.push(p)
  });
  let actions = runtime.render(() => h.ui.useStorefrontProductActions({
    subdomain: 'tenant-a'
  }));
  const product = fixture(0);
  actions.addProductToCart(product, {
    selectedVariant: product.variants[0]
  });
  assert.equal(added[0].sellingPrice, 0);
  assert.equal(added[0].cartPrice, 0);
  const paid = fixture(200);
  paid.scheduledSale = {
    discountType: 'fixed',
    discountValue: 20
  };
  actions.addProductToCart(paid, {
    selectedVariant: paid.variants[0]
  });
  assert.equal(added[1].cartPrice, 160);
  runtime.unmount();
});
test('checkout refresh ignores late tenant response and unmounted completion', async t => {
  const pending = [];
  t.mock.method(h.ui.API, 'get', url => new Promise(resolve => pending.push({
    url,
    resolve
  })));
  const runtime = hooks(t);
  let tenant = 'tenant-a';
  const items = [{
    _id: 'p'
  }];
  const view = () => runtime.render(() => h.ui.useCheckoutCartProducts({
    cartItems: items,
    subdomain: tenant
  }));
  view();
  tenant = 'tenant-b';
  assert.deepEqual(view(), {});
  pending[1].resolve({
    data: {
      data: [{
        _id: 'p',
        sellingPrice: 0
      }]
    }
  });
  await Promise.resolve();
  assert.equal(view().p.sellingPrice, 0);
  pending[0].resolve({
    data: {
      data: [{
        _id: 'p',
        sellingPrice: 999
      }]
    }
  });
  await Promise.resolve();
  assert.equal(view().p.sellingPrice, 0);
  runtime.unmount();
});
test('checkout totals and coupon payload keep zero with multiple items', async t => {
  const runtime = hooks(t);
  const items = [{
    _id: 'free',
    cartPrice: 0,
    sellingPrice: 1200,
    quantity: 4
  }, {
    _id: 'paid',
    cartPrice: 90,
    quantity: 2
  }];
  const total = items.reduce((sum, i) => sum + prices.getCartItemPrice(i) * i.quantity, 0);
  const totals = runtime.render(() => h.ui.useCheckoutTotals({
    cartTotal: total,
    city: 'Inside Dhaka',
    promotionPreview: {
      discountAmount: 10
    }
  }));
  assert.equal(totals.subtotal, 180);
  assert.equal(totals.totalAmount, 250);
  runtime.unmount();
  globalValue(t, 'sessionStorage', {
    getItem: () => null
  });
  let payload;
  t.mock.method(h.ui.API, 'post', async (url, p) => {
    payload = p;
    return {
      data: {
        data: {
          discountAmount: 10
        }
      }
    };
  });
  const couponRuntime = hooks(t);
  const coupon = () => couponRuntime.render(() => h.ui.useCheckoutCoupon({
    cartItems: items,
    subtotal: total,
    subdomain: 'tenant-a'
  }));
  coupon().setPromotionCode('TEST');
  await coupon().handleApplyPromotion();
  assert.equal(payload.items[0].price, 0);
  assert.equal(payload.subtotal, 180);
  couponRuntime.unmount();
});
for (const preset of [...getPrebuiltThemes(), {
  id: 'atelier-editorial'
}]) test(preset.id + ': actual cart and checkout render zero price', () => {
  const item = {
    _id: 'p',
    cartItemId: 'p:v',
    title: 'Free item',
    pricing: {
      sellingPrice: 1200,
      discount: 10
    },
    selectedVariant: {
      pricing: {
        price: 0
      }
    },
    cartPrice: 0,
    finalPrice: 0,
    sellingPrice: 1200,
    quantity: 2,
    images: []
  };
  const presentationVariant = preset.id === 'atelier-editorial' ? 'atelier-editorial' : 'default';
  const props = {
    presentationVariant,
    cartItems: [item],
    subtotal: 0,
    shipping: 80,
    total: 80,
    totalSavings: 0,
    getCartImageUrl: () => '',
    recommendations: [],
    productActions: {},
    themedProductCard: {}
  };
  const cart = h.render(h.React.createElement(h.ui.CartView, props));
  assert.match(cart, /৳ 0/);
  assert.doesNotMatch(cart, /৳ 1200/);
  const checkout = h.render(h.React.createElement(h.ui.CheckoutOrderSummary, {
    ...props,
    productsDetails: {},
    visiblePolicies: [],
    checkoutBranding: {},
    promotionCode: '',
    finalShippingCost: 80,
    totalAmount: 80
  }));
  assert.match(checkout, /৳0<\/p>/);
  assert.doesNotMatch(checkout, /1200/);
});
function otpSetup(t) {
  t.mock.timers.enable({
    apis: ['Date', 'setInterval'],
    now: new Date('2026-10-20T00:00:00Z')
  });
  const runtime = hooks(t);
  t.after(() => runtime.unmount());
  let resetKey = 'a';
  let tenant = 'tenant-a';
  let phone = '01712345678';
  const requests = [];
  t.mock.method(h.ui.API, 'post', (url, payload) => new Promise((resolve, reject) => requests.push({
    url,
    payload,
    resolve,
    reject
  })));
  const view = () => runtime.render(() => h.ui.useCheckoutPhoneOtp({
    subdomain: tenant,
    resetKey,
    phone
  }));
  return {
    runtime,
    requests,
    view,
    change: key => {
      resetKey = key;
    },
    changeTenant: value => {
      tenant = value;
    },
    phone: value => {
      phone = value;
    },
    send: () => view().sendOtp({
      phone,
      items: [{
        productId: 'p',
        variantId: 'v',
        quantity: 1
      }]
    }),
    accept(i = 0) {
      requests[i].resolve({
        data: {
          maskedPhone: '017****5678',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 60000).toISOString()
        }
      });
    },
    fail(i, message, extra = {}) {
      requests[i].reject({
        response: {
          data: {
            error: message,
            ...extra
          }
        }
      });
    },
    async ready() {
      const p = this.send();
      this.accept();
      await p;
      return view();
    }
  };
}
test('OTP initial send, duplicate clicks, server cooldown, resend and cleanup', async t => {
  const x = otpSetup(t);
  const clearTimer = t.mock.method(globalThis, 'clearInterval');
  const first = x.send();
  const duplicate = x.send();
  assert.equal(x.requests.length, 1);
  assert.equal(x.view().sending, true);
  assert.equal(await duplicate, null);
  x.accept();
  await first;
  let otp = x.view();
  assert.equal(otp.codeSent, true);
  assert.equal(otp.cooldownSeconds, 60);
  assert.equal(await x.send(), null);
  x.change('cart-changed');
  assert.equal(x.view().codeSent, false);
  assert.equal(x.view().cooldownSeconds, 60);
  t.mock.timers.tick(60000);
  assert.equal(x.view().cooldownSeconds, 0);
  const resend = x.send();
  x.accept(1);
  await resend;
  otp = x.view();
  assert.equal(otp.otp, '');
  assert.equal(otp.cooldownSeconds, 60);
  const clearedBefore = clearTimer.mock.callCount();
  x.runtime.unmount();
  assert.ok(clearTimer.mock.callCount() > clearedBefore);
  t.mock.timers.tick(300000);
});
test('OTP rate limit and transport failure show error without an uncontrolled retry', async t => {
  const x = otpSetup(t);
  const send = x.send();
  x.fail(0, 'Please wait', {
    retryAfterSeconds: 37
  });
  await send;
  assert.equal(x.view().cooldownSeconds, 37);
  assert.match(x.view().error, /Please wait/);
  assert.equal(await x.send(), null);
  t.mock.timers.tick(37000);
  const retry = x.send();
  x.requests[1].reject(new Error('Network down'));
  await retry;
  assert.match(x.view().error, /Could not send/);
  assert.equal(x.requests.length, 2);
  assert.equal(x.view().sending, false);
  x.runtime.unmount();
});
test('OTP numeric paste, invalid, expired and correct proof stay server-bound', async t => {
  const x = otpSetup(t);
  await x.ready();
  x.view().setOtp('a12 3456z7');
  assert.equal(x.view().otp, '123456');
  const verify = () => x.view().verifyOtp({
    phone: '01712345678',
    items: [{
      productId: 'p',
      variantId: 'v',
      quantity: 1
    }]
  });
  let pending = verify();
  assert.equal(await verify(), null);
  x.fail(1, 'Invalid or expired verification code.');
  assert.equal(await pending, null);
  assert.equal(x.view().verified, false);
  pending = verify();
  x.requests[2].resolve({
    data: {
      phoneVerificationToken: 'mock-proof',
      expiresAt: new Date(Date.now() + 600000).toISOString()
    }
  });
  await pending;
  assert.equal(x.view().verified, true);
  assert.equal(x.requests[2].payload.checkoutSessionId, x.requests[0].payload.checkoutSessionId);
  x.change('different-phone-cart');
  assert.equal(x.view().phoneVerificationToken, '');
  assert.equal(x.view().otp, '');
  x.change('a');
  t.mock.timers.tick(600000);
  assert.equal(x.view().verified, false);
  assert.equal(x.view().expired, true);
  assert.equal(await verify(), null);
  assert.equal(x.requests.length, 3);
  x.runtime.unmount();
});
test('OTP stale request or unmounted response never supplies an order proof', async t => {
  const x = otpSetup(t);
  await x.ready();
  x.view().setOtp('123456');
  const pending = x.view().verifyOtp({
    phone: '01712345678',
    items: []
  });
  x.change('different');
  x.view();
  x.requests[1].resolve({
    data: {
      phoneVerificationToken: 'stale',
      expiresAt: new Date(Date.now() + 600000).toISOString()
    }
  });
  assert.equal(await pending, null);
  assert.equal(x.view().verified, false);
  x.runtime.unmount();
});
test('active OTP dialog exposes resend states, sanitizes pasted input and preserves busy restrictions', () => {
  const base = {
    open: true,
    state: 'otp_input',
    otp: '123456',
    onCancel() {},
    onSendCode() {},
    onResendCode() {},
    onVerifyCode() {},
    setOtp() {},
    cooldownSeconds: 60
  };
  for (const presentationVariant of ['default', 'atelier-editorial']) {
    const html = h.render(h.React.createElement(h.ui.CheckoutOtpModal, {
      ...base,
      presentationVariant
    }));
    assert.match(html, /Resend in 60s/);
    assert.match(html, /autoComplete="one-time-code"/);
    const expired = h.render(h.React.createElement(h.ui.CheckoutOtpModal, {
      ...base,
      presentationVariant,
      cooldownSeconds: 0,
      expired: true
    }));
    assert.match(expired, /Verification code expired/);
    assert.match(expired, /Resend code/);
  }
  let value;
  const node = h.ui.CheckoutOtpModal({
    ...base,
    presentationVariant: 'default',
    setOtp: v => {
      value = v;
    }
  });
  find(node, n => n.props?.id === 'checkout-modal-otp').props.onChange({
    target: {
      value: '12a3456z'
    }
  });
  assert.equal(value, '123456');
  const busy = h.ui.CheckoutOtpModal({
    ...base,
    presentationVariant: 'default',
    sending: true
  });
  let enabled = 0;
  walk(busy, n => {
    if (n.type === 'button' && !n.props.disabled) enabled++;
  });
  assert.equal(enabled, 0);
});
const Module = require('node:module');
const adminRequire = Module.createRequire(path.join(root, 'ecommerce-admin/package.json'));
const parse = adminRequire('@babel/parser').parse;
function sourceFunction(relative, name, context) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const ast = parse(source, {
    sourceType: 'unambiguous',
    plugins: ['jsx']
  });
  for (const statement of ast.program.body) {
    const assignment = statement.expression;
    if (assignment?.type === 'AssignmentExpression' && assignment.left.object?.name === 'exports' && assignment.left.property?.name === name) return vm.runInNewContext('(' + source.slice(assignment.right.start, assignment.right.end) + ')', context);
  }
  throw Error('Missing actual function ' + name);
}
for (const audience of ['guest', 'customer']) for (const [override, expected] of [[undefined, 1080], [null, 1080], [0, 0], [200, 180]]) test(audience + ' actual order controller ignores client prices; override ' + override, async () => {
  const shopId = 'ccccccccccccccccccccccc1';
  const product = fixture(override);
  product.isActive = true;
  product.status = 'Published';
  product.shop_id = shopId;
  product.variants.id = id => product.variants.find(v => v._id === id);
  const user = {
    _id: 'ddddddddddddddddddddddd1',
    fullName: 'Test',
    email: 'test@example.invalid',
    status: 'Active'
  };
  const queries = [];
  const writes = [];
  let committed = false;
  let proofConsumed = false;
  const session = {
    startTransaction() {},
    async commitTransaction() {
      committed = true;
    },
    async abortTransaction() {},
    endSession() {}
  };
  const query = value => ({
    session: async () => value,
    select() {
      return this;
    }
  });
  const context = {
    console: {
      error() {}
    },
    mongoose: {
      startSession: async () => session
    },
    getPublicShopBySubdomain: async () => ({
      _id: shopId
    }),
    normalizeBDPhone: p => p,
    User: {
      findOne: () => query(user),
      findById: () => query(user)
    },
    Product: {
      findOne: filter => {
        queries.push(filter);
        return query(filter.shop_id === shopId && filter._id === product._id ? product : null);
      }
    },
    Order: {
      findOne: () => query(null),
      create: async records => {
        writes.push(...records);
        return records.map(r => ({
          ...r,
          _id: 'eeeeeeeeeeeeeeeeeeeeeee1'
        }));
      }
    },
    InventoryLog: {
      insertMany: async () => {}
    },
    ConsentLog: {
      create: async () => {}
    },
    consumeCheckoutPhoneProof: async () => {
      proofConsumed = true;
    },
    decrementVariantStockAtomically: async () => {
      assert.equal(proofConsumed, true);
      return {
        beforeStock: 5,
        afterStock: 3
      };
    },
    getScheduledSaleLinePrice: async () => null,
    enqueueOrderReceipt: async () => {},
    enqueueLowStockAlertsForLogs: async () => {},
    notifyNewOrder() {},
    notifyOrderCreated() {},
    logAudit: async () => {},
    sanitizeOrderForCustomer: o => o,
    getShippingCostForZone: () => 80,
    ...require('../services/orders/orderPricingService'),
    createOrderSchema: require('../validations/orderValidation').createOrderSchema
  };
  const body = {
    subdomain: 'tenant-a',
    customer: {
      fullName: 'Test',
      email: user.email,
      phone: '01712345678'
    },
    shippingZone: 'Inside Dhaka',
    shippingAddress: 'Test address, Inside Dhaka',
    items: [{
      product: product._id,
      productId: product._id,
      variantId: product.variants[0]._id,
      quantity: 2,
      price: -999999
    }],
    shipping: {
      zone: 'Inside Dhaka',
      address: {
        fullName: 'Test',
        phone: '01712345678',
        addressLine: 'Test address',
        city: 'Inside Dhaka'
      }
    },
    payment: {
      method: 'COD'
    },
    consent: {
      checkoutPolicyAccepted: true,
      marketingEmailOptIn: false
    },
    checkoutSessionId: 'test-session-123456789',
    phoneVerificationToken: 'test-proof-123456789012345678901234567890',
    idempotencyKey: 'test-order',
    totalAmount: 1
  };
  if (audience === 'customer') {
    delete body.subdomain;
    delete body.customer;
    delete body.shippingZone;
    delete body.shippingAddress;
    delete body.totalAmount;
    body.items = body.items.map(({
      product,
      price,
      ...i
    }) => i);
  }
  const req = {
    body,
    tenantId: shopId,
    user,
    headers: {},
    get: () => '',
    ip: '127.0.0.1'
  };
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  const fn = sourceFunction('ecommerce-backend/backend/controllers/' + (audience === 'guest' ? 'publicController.js' : 'orderController.js'), audience === 'guest' ? 'createPublicOrder' : 'createOrder', context);
  await fn(req, res);
  assert.equal(res.statusCode, 201, JSON.stringify(res.body));
  assert.equal(committed, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].items[0].price, expected);
  assert.equal(writes[0].pricing.subtotal, expected * 2);
  assert.equal(writes[0].pricing.total, expected * 2 + 80);
  assert.equal(res.body.total, expected * 2 + 80);
  assert.equal(queries[0].shop_id, shopId);
});
test('checkout cooldown metadata is forwarded without changing provider or OTP limits', async () => {
  const otpFile = fs.readFileSync(path.join(root, 'ecommerce-backend/backend/services/checkout/checkoutOtpService.js'), 'utf8');
  let smsCalls = 0;
  const otpModule = {
    exports: {}
  };
  vm.runInNewContext(otpFile, {
    module: otpModule,
    require: id => {
      if (id === 'crypto') return require('node:crypto');
      if (id === '../otpService') return {
        PURPOSES: {
          customerOrderPhone: 'customer_order_phone'
        },
        createOtp: async () => ({
          success: false,
          code: 'OTP_RESEND_COOLDOWN',
          retryAfterSeconds: 37,
          error: 'Please wait'
        })
      };
      if (id === '../sms/smsProviderService') return {
        sendSms: async () => {
          smsCalls++;
        },
        SmsProviderError: class extends Error {}
      };
      if (id === '../../utils/phoneUtils') return {
        normalizeBDPhone: p => p
      };
      throw Error('Unmocked import ' + id);
    }
  });
  const result = await otpModule.exports.sendCheckoutPhoneOtp({
    shop: {
      _id: 'shop'
    },
    phone: '01712345678',
    checkoutSessionId: 'session',
    items: [{
      productId: 'p',
      quantity: 1
    }]
  }).catch(e => e);
  assert.equal(result.statusCode, 429);
  assert.equal(result.retryAfterSeconds, 37);
  assert.equal(smsCalls, 0);
  const controllerModule = {
    exports: {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'ecommerce-backend/backend/controllers/checkoutOtpController.js'), 'utf8'), {
    exports: controllerModule.exports,
    require: id => {
      if (id === '../models/Shop') return {
        findById: () => ({
          select: () => ({
            lean: async () => ({
              _id: 'shop'
            })
          })
        })
      };
      if (id === '../services/auditLogService') return {
        logAudit: async () => {}
      };
      if (id === '../services/checkout/checkoutOtpService') return {
        ...otpModule.exports,
        sendCheckoutPhoneOtp: async () => {
          throw result;
        }
      };
      throw Error('Unmocked import ' + id);
    }
  });
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
    }
  };
  await controllerModule.exports.sendCheckoutOtp({
    tenantId: 'shop',
    body: {}
  }, res);
  assert.equal(res.code, 429);
  assert.equal(res.body.retryAfterSeconds, 37);
});
test('verification retry is bounded, tenant-scoped, and rechecks suspension instead of bypassing it', async () => {
  const file = fs.readFileSync(path.join(root, 'ecommerce-backend/backend/middlewares/vendorVerificationGuard.js'), 'utf8');
  const req = {
    tenantId: 'tenant-a',
    user: {
      id: 'owner'
    }
  };
  let calls = 0,
    next = 0;
  const exported = {};
  vm.runInNewContext(file, {
    exports: exported,
    console: {
      error() {}
    },
    require: () => ({
      ensureShopVerificationStatus: async (tenant, options) => {
        assert.equal(tenant, req.tenantId);
        assert.equal(options.owner, req.user);
        calls++;
        if (calls === 1) throw Object.assign(new Error('Stale'), {
          name: 'VersionError'
        });
        return {
          shop: {
            suspended: true
          },
          status: {
            blocked: true
          }
        };
      },
      isVerificationSuspension: shop => shop.suspended
    })
  });
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
    }
  };
  await exported.blockVerificationSuspendedShop(req, res, () => next++);
  assert.equal(calls, 2);
  assert.equal(next, 0);
  assert.equal(res.code, 403);
  calls = 0;
  const fail = {};
  vm.runInNewContext(file, {
    exports: fail,
    console: {
      error() {}
    },
    require: () => ({
      ensureShopVerificationStatus: async () => {
        calls++;
        throw Object.assign(new Error('Still stale'), {
          name: 'VersionError'
        });
      }
    })
  });
  await fail.blockVerificationSuspendedShop(req, res, () => next++);
  assert.equal(calls, 2);
  assert.equal(res.code, 500);
  assert.equal(next, 0);
});
for (const audience of ['guest', 'customer']) test(audience + ' checkout: verification gates order, reopen retains cooldown, duplicate verification places once', async t => {
  const product = fixture(0);
  const cartItems = [{
    ...product,
    variantId: product.variants[0]._id,
    cartItemId: product._id + ':' + product.variants[0]._id,
    cartPrice: 0,
    finalPrice: 0,
    quantity: 2
  }];
  let clears = 0;
  const cart = {
    cartItems,
    cartTotal: 0,
    clearCart: () => clears++,
    updateQuantity() {},
    removeFromCart() {}
  };
  const environment = {
    theme: resolvePrebuiltTheme({
      presetId: 'atelier-editorial'
    }),
    tenant: 'tenant-a',
    user: audience === 'customer' ? {
      _id: 'customer',
      role: 'Customer'
    } : null
  };
  globalValue(t, 'sessionStorage', {
    getItem: () => null,
    removeItem() {}
  });
  const requests = [];
  let finishOrder;
  t.mock.method(h.ui.API, 'get', async () => ({
    data: {
      data: [product]
    }
  }));
  t.mock.method(h.ui.API, 'post', async (url, payload) => {
    requests.push({
      url,
      payload
    });
    if (url.endsWith('/send-otp')) return {
      data: {
        maskedPhone: '017****5678',
        resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString()
      }
    };
    if (url.endsWith('/verify-otp')) return {
      data: {
        phoneVerificationToken: 'mock-proof',
        expiresAt: new Date(Date.now() + 600000).toISOString()
      }
    };
    if (url.endsWith('/orders')) return new Promise(resolve => {
      finishOrder = () => resolve({
        data: {
          orderId: 'order-id'
        }
      });
    });
    throw Error('Unmocked POST');
  });
  const runtime = hooks(t, ctx => ctx._currentValue === undefined ? cart : environment);
  t.after(() => runtime.unmount());
  const view = () => runtime.render(() => h.ui.CheckoutPage({
    params: {
      subdomain: 'tenant-a'
    }
  }));
  let tree = view();
  const fields = find(tree, n => typeof n.props?.onInputChange === 'function');
  for (const [name, value] of Object.entries({
    fullName: 'Test',
    email: 'test@example.invalid',
    phone: '01712345678',
    address: 'Test address',
    city: 'Inside Dhaka'
  })) fields.props.onInputChange({
    target: {
      name,
      value
    }
  });
  tree = view();
  await Promise.resolve();
  tree = view();
  find(tree, n => typeof n.props?.setPolicyAccepted === 'function').props.setPolicyAccepted(true);
  tree = view();
  const submit = () => find(view(), n => typeof n.props?.onSubmit === 'function').props.onSubmit({
    preventDefault() {}
  });
  await submit();
  assert.equal(requests.length, 0, 'No order or OTP should auto-send before confirmation');
  let modal = find(view(), n => typeof n.props?.onVerifyCode === 'function');
  assert.equal(modal.props.open, true);
  await modal.props.onSendCode();
  modal = find(view(), n => typeof n.props?.onVerifyCode === 'function');
  assert.equal(modal.props.cooldownSeconds, 60);
  modal.props.onCancel();
  assert.equal(find(view(), n => typeof n.props?.onVerifyCode === 'function').props.open, false);
  await submit();
  modal = find(view(), n => typeof n.props?.onVerifyCode === 'function');
  assert.equal(modal.props.state, 'otp_input');
  assert.equal(modal.props.cooldownSeconds, 60);
  modal.props.setOtp('123456');
  modal = find(view(), n => typeof n.props?.onVerifyCode === 'function');
  const first = modal.props.onVerifyCode();
  const duplicate = modal.props.onVerifyCode();
  await duplicate;
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  const orders = requests.filter(r => r.url.endsWith('/orders'));
  assert.equal(orders.length, 1);
  assert.equal(orders[0].payload.phoneVerificationToken, 'mock-proof');
  assert.equal(orders[0].payload.consent.marketingEmailOptIn, false);
  if (audience === 'guest') {
    assert.equal(orders[0].payload.items[0].price, 0);
    assert.equal(orders[0].payload.totalAmount, 80);
  } else assert.equal(orders[0].payload.items[0].price, undefined);
  assert.equal(clears, 0);
  finishOrder();
  await first;
  assert.equal(clears, 1);
});
test('OTP responses from a previous tenant are ignored even with identical checkout reset keys', async t => {
  const x = otpSetup(t);
  const pending = x.send();
  x.changeTenant('tenant-b');
  x.view();
  x.accept();
  assert.equal(await pending, null);
  assert.equal(x.view().codeSent, false);
  assert.equal(x.view().phoneVerificationToken, '');
  x.runtime.unmount();
});
