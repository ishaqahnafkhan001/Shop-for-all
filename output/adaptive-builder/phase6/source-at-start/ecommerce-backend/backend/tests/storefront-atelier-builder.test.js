const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const {
  pathToFileURL
} = require('node:url');
const contract = require('@scaleup/storefront-theme');
const prebuilt = require('@scaleup/storefront-theme/prebuilt');
const {
  loadBuilder,
  root
} = require('./helpers/atelier-builder.cjs');
let h;
test.before(async () => {
  h = await loadBuilder();
});
const at = '2026-01-01T00:00:00.000Z';
const candidate = () => prebuilt.resolvePrebuiltTheme({
  currentTheme: {
    hero: {
      bannerSlides: [{
        id: 'merchant-slide',
        title: 'Merchant headline',
        desktopImage: '/merchant-hero.svg'
      }]
    }
  },
  presetId: 'atelier-editorial',
  appliedAt: at
});
const product = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaa1',
  slug: 'merchant-item',
  title: 'Merchant item',
  category: 'Merchant category',
  sellingPrice: 100,
  finalPrice: 100,
  totalStock: 3,
  images: ['/fixture.svg'],
  variants: [{
    _id: 'bbbbbbbbbbbbbbbbbbbbbbb1',
    isActive: true,
    stock: 3,
    attributes: []
  }]
};
const walk = (node, visit) => {
  if (Array.isArray(node)) return node.forEach(child => walk(child, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  walk(node.props?.children, visit);
};
function localComponentState(t) {
  const values = [];
  let cursor = 0;
  t.mock.method(h.React, 'useState', initial => {
    const index = cursor++;
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], next => {
      values[index] = typeof next === 'function' ? next(values[index]) : next;
    }];
  });
  return callback => {
    cursor = 0;
    return callback();
  };
}
test('trusted availability keeps nine ordinary gallery cards and hides revoked Atelier at confirmation', () => {
  assert.equal(h.ui.getAvailableGalleryThemes().length, 9);
  assert.equal(h.ui.getAvailableGalleryThemes({
    'atelier-editorial': {
      available: true
    }
  }).length, 10);
  for (const policy of [{}, {
    'atelier-editorial': {
      available: false
    }
  }, {
    'atelier-editorial': {
      available: 'true'
    }
  }]) assert.equal(h.ui.isGalleryThemeAvailable({
    id: 'atelier-editorial'
  }, policy), false);
  assert.equal(h.ui.isGalleryThemeAvailable({
    id: 'modern-general'
  }, {}), true);
  const source = fs.readFileSync(path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx'), 'utf8');
  assert.match(source, /isGalleryThemeAvailable\(pendingTheme, themeAvailability\)/);
  assert.match(source, /await onApply\(pendingTheme\) === false/);
});
test('gallery identifies an existing Atelier presentation when re-adoption is off or appearance provenance differs', () => {
  const render = theme => h.render(h.React.createElement(h.ui.ThemeGallery, {
    open: true,
    currentTheme: theme,
    planAccess: {
      storeBuilderAccess: 'full'
    },
    products: [product],
    categories: [],
    reviews: [],
    onClose() {},
    onApply() {}
  }));
  const html = render(candidate());
  assert.match(html, /Based on Atelier Editorial/);
  assert.equal((html.match(/Use theme/g) || []).length, 9, 'Hidden current preset is named but not offered for re-adoption');
  const limited = prebuilt.resolvePrebuiltTheme({
    currentTheme: candidate(),
    presetId: 'modern-general',
    planAccess: {
      storeBuilderAccess: 'limited'
    },
    appliedAt: at
  });
  assert.match(render(limited), /Current page presentation: Atelier Editorial/);
  assert.match(render(prebuilt.resolvePrebuiltTheme({
    presetId: 'atelier-editorial',
    planAccess: {
      storeBuilderAccess: 'limited'
    },
    appliedAt: at
  })), /appearance-only adaptation/);
});
for (const preset of prebuilt.getPrebuiltThemes()) test(preset.id + ': full round-trip switching preserves merchant content and clears the marker', () => {
  const initial = contract.normalizeTheme({
    logoUrl: '/merchant-logo.svg',
    faviconUrl: '/merchant-icon.png',
    navigation: [{
      id: 'nav',
      label: 'Merchant catalog',
      url: '/collections/edit'
    }],
    hero: {
      bannerSlides: [{
        id: 'merchant-hero',
        title: 'Merchant headline',
        subtitle: 'Merchant subtitle',
        desktopImage: '/merchant-hero.jpg',
        primaryCtaText: 'Explore',
        primaryCtaLink: '/collections/edit'
      }]
    },
    footer: {
      text: 'Merchant footer',
      contactEmail: 'support@example.test'
    },
    policies: {
      refund: 'Merchant refund',
      shipping: 'Merchant shipping',
      privacy: 'Merchant privacy',
      terms: 'Merchant terms'
    },
    seo: {
      title: 'Merchant SEO'
    },
    paymentSettings: {
      codEnabled: true
    },
    checkoutBranding: {
      bannerText: 'Merchant checkout'
    },
    homepageSections: [{
      id: 'featured',
      type: 'FeaturedProducts',
      settings: {
        productIds: [product._id]
      }
    }, {
      id: 'story',
      type: 'BrandStory',
      settings: {
        text: 'Merchant story'
      }
    }, {
      id: 'reviews',
      type: 'Reviews',
      settings: {
        reviewIds: ['ccccccccccccccccccccccc1']
      }
    }]
  });
  const atelier = prebuilt.resolvePrebuiltTheme({
    currentTheme: initial,
    presetId: 'atelier-editorial',
    appliedAt: at
  });
  const result = prebuilt.resolvePrebuiltTheme({
    currentTheme: atelier,
    presetId: preset.id,
    appliedAt: at
  });
  assert.equal(contract.getStorefrontPresentationVariant(atelier), 'atelier-editorial');
  assert.equal(contract.getStorefrontPresentationVariant(result), 'default');
  for (const resultTheme of [atelier, result]) {
    for (const key of ['logoUrl', 'faviconUrl', 'navigation', 'footer', 'policies', 'seo', 'paymentSettings', 'checkoutBranding']) assert.deepEqual(resultTheme[key], initial[key], key);
    assert.deepEqual(resultTheme.hero.bannerSlides, initial.hero.bannerSlides);
    for (const section of initial.homepageSections) {
      const saved = resultTheme.homepageSections.find(x => x.id === section.id);
      assert.ok(saved);
      for (const key of ['productIds', 'reviewIds', 'text']) if (section.settings[key] !== undefined) assert.deepEqual(saved.settings[key], section.settings[key]);
    }
  }
});
test('only the section structures bypassed by Atelier are theme-controlled; content remains editable', () => {
  const theme = candidate();
  theme.homepageSections = ['CategoryList', 'BrandStory', 'PromoBlock', 'Banner'].map((type, index) => contract.createDefaultSection(type, {
    id: 'section-' + index
  }));
  const options = {
    theme,
    planAccess: {
      storeBuilderAccess: 'full'
    }
  };
  const caps = contract.getThemeCapabilities(theme, options.planAccess);
  for (const [index, type] of ['CategoryList', 'BrandStory', 'PromoBlock'].entries()) {
    assert.equal(caps.sections[type].variants.merchantSelectable, false);
    assert.equal(contract.getThemePropertyCapability('homepageSections.' + index + '.settings.variant', options).classification, 'theme-controlled');
    assert.equal(contract.getThemePropertyCapability('homepageSections.' + index + '.settings.text', options).merchantEditable, true);
  }
  assert.equal(caps.sections.Banner.variants.merchantSelectable, true);
  const legacy = contract.getThemeCapabilities(prebuilt.resolvePrebuiltTheme({
    presetId: 'modern-general',
    appliedAt: at
  }), options.planAccess);
  for (const type of ['CategoryList', 'BrandStory', 'PromoBlock']) assert.equal(legacy.sections[type].variants.merchantSelectable, true);
});
test('supported typography, colors, mobile composition and grid controls reach the shared renderer', () => {
  const theme = contract.normalizeTheme(contract.mergeThemePatch(candidate(), {
    typography: {
      headingFont: 'Georgia',
      bodyFont: 'Arial',
      headingWeight: '600'
    },
    colors: {
      hero: {
        title: '#123456'
      }
    },
    mobile: {
      heroComposition: 'Image first',
      showBottomNavigation: true
    },
    allProducts: {
      mobileColumns: 1,
      desktopColumns: 2
    }
  }));
  const html = h.render(h.React.createElement(h.ui.StorefrontPreviewContent, {
    theme,
    shopName: 'Merchant name',
    availableProducts: [product],
    availableCategories: ['Merchant category']
  }));
  assert.match(html, /--sf-heading-font:Georgia/);
  assert.match(html, /--sf-body-font:Arial/);
  assert.match(html, /--sf-heading-weight:600/);
  assert.match(html, /--sf-hero-title:#123456/);
  assert.match(html, /data-mobile-composition="Image first"/);
  assert.match(html, /grid-cols-1/);
  assert.match(html, /Cart/);
  const css = fs.readFileSync(path.join(root, 'packages/storefront-renderer/atelier/atelier.css'), 'utf8');
  assert.match(css, /max-width:767px/);
  assert.match(css, /data-mobile-composition="Image first".*order: -1/);
});
for (const mode of ['home', 'product', 'cart', 'checkout', 'policy']) test('existing ' + mode + ' preview uses Atelier scope and the shared presentation', () => {
  const html = h.render(h.React.createElement(h.ui.StorefrontPreviewContent, {
    theme: candidate(),
    previewPage: mode,
    shopName: 'Merchant name',
    availableProducts: [product],
    availableCategories: ['Merchant category']
  }));
  assert.match(html, /data-sf-presentation="atelier-editorial"/);
  assert.match(html, /DM Sans/);
  assert.match(html, /atelier-header/);
  assert.match(html, /atelier-footer/);
  const markers = {
    home: 'atelier-hero',
    product: 'atelier-product',
    cart: 'atelier-cart',
    checkout: 'checkout-summary',
    policy: 'atelier-policy'
  };
  assert.ok(html.includes(markers[mode]));
  if (mode === 'checkout') assert.match(h.render(h.React.createElement(h.ui.CheckoutBrandingPreview, {
    theme: candidate(),
    shopName: 'Merchant name'
  })), /data-sf-presentation="atelier-editorial"/);
  assert.ok(!html.includes('FORM &amp; FOUND'));
});
test('Atelier checkout preview uses shared consent, local-only controls and a no-op submission boundary', t => {
  const render = localComponentState(t);
  const props = {
    page: 'checkout',
    theme: candidate(),
    shopName: 'Merchant',
    products: [product]
  };
  let tree = render(() => h.ui.PreviewCommercePage(props));
  const find = name => {
    let found;
    walk(tree, n => {
      if (n.type?.name === name) found = n;
    });
    assert.ok(found, name);
    return found;
  };
  find('CheckoutDetailsColumn').props.onInputChange({
    target: {
      name: 'fullName',
      value: 'Synthetic customer'
    }
  });
  find('CheckoutMarketingConsent').props.onChange(true);
  find('CheckoutOrderSummary').props.setPolicyAccepted(true);
  find('CheckoutOrderSummary').props.setPromotionCode('TEST');
  tree = render(() => h.ui.PreviewCommercePage(props));
  assert.equal(find('CheckoutDetailsColumn').props.formData.fullName, '', 'Representative preview fields stay non-live');
  assert.equal(find('CheckoutMarketingConsent').props.checked, true);
  assert.equal(find('CheckoutOrderSummary').props.policyAccepted, true);
  assert.equal(find('CheckoutOrderSummary').props.promotionCode, '', 'Preview never claims a coupon was validated');
  let prevented = 0,
    calls = 0;
  t.mock.method(globalThis, 'fetch', () => {
    calls++;
    throw new Error('Network forbidden');
  });
  tree.props.onSubmit({
    preventDefault() {
      prevented++;
    }
  });
  find('CheckoutOrderSummary').props.onApplyPromotion();
  assert.equal(prevented, 1);
  assert.equal(calls, 0);
  assert.equal(find('CheckoutOrderSummary').props.phoneVerified, false, 'Preview cannot activate OTP or order creation');
  assert.ok(h.modules.every(id => !/\/api\/|AuthContext|CartContext/.test(id)));
});
test('shared marketing control keeps separate opt-in event semantics and identical live markup', () => {
  let checked = false;
  const view = h.ui.CheckoutMarketingConsent({
    checked: false,
    onChange: value => {
      checked = value;
    }
  });
  let input;
  walk(view, n => {
    if (n.type === 'input') input = n;
  });
  input.props.onChange({
    target: {
      checked: true
    }
  });
  assert.equal(checked, true);
  const html = h.render(view);
  assert.match(html, /Optional; unsubscribe anytime/);
  assert.ok(!html.includes('checked=""'));
});
test('actual undo/redo/recovery functions preserve optional identity and merchant settings', async () => {
  const editor = await require('./helpers/adaptive-editor.cjs').loadAdaptiveEditor();
  const req = Module.createRequire(path.join(root, 'ecommerce-admin/package.json'));
  const parser = req('@babel/parser');
  const generate = req('@babel/generator').default;
  const source = fs.readFileSync(path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx'), 'utf8');
  const ast = parser.parse(source, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  const names = ['applyBuilderSnapshot', 'undoBuilderChange', 'redoBuilderChange'];
  const functions = {};
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && names.includes(node.id?.name)) functions[node.id.name] = generate(node.init).code;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  const first = h.ui.stableStringify({
    theme: prebuilt.resolvePrebuiltTheme({
      presetId: 'modern-general',
      appliedAt: at
    }),
    searchAliases: ['Merchant'],
    customDomain: {
      domain: 'merchant.example.test'
    },
    storewideDiscount: 7
  });
  const second = h.ui.stableStringify({
    ...JSON.parse(first),
    theme: candidate()
  });
  let applied,
    aliases,
    domain,
    discount,
    history = {
      past: [first],
      future: []
    };
  const context = {
    parseBuilderRecovery: editor.ui.parseBuilderRecovery,
    themeRevision: 0,
    toast: { error() {} },
    safeParseSnapshot: h.ui.safeParseSnapshot,
    loadBuilderTheme: h.ui.loadBuilderTheme,
    historyModeRef: {
      current: ''
    },
    setTheme: theme => {
      applied = theme;
    },
    setSearchAliases: value => {
      aliases = value;
    },
    setCustomDomain: value => {
      domain = value;
    },
    setStorewideDiscount: value => {
      discount = value;
    },
    canUndo: true,
    canRedo: false,
    currentSnapshot: second,
    HISTORY_LIMIT: 50,
    editorHistory: history,
    setEditorHistory: fn => {
      history = fn(history);
    },
    result: null
  };
  vm.runInNewContext(names.map(name => 'const ' + name + ' = ' + functions[name] + ';').join('\n') + 'result={' + names.join(',') + '};', context);
  context.result.undoBuilderChange();
  assert.equal(contract.getStorefrontPresentationVariant(applied), 'default');
  assert.equal(aliases[0], 'Merchant');
  assert.equal(domain.domain, 'merchant.example.test');
  assert.equal(discount, 7);
  context.editorHistory = history;
  context.currentSnapshot = first;
  context.canRedo = true;
  context.result.redoBuilderChange();
  assert.equal(contract.getStorefrontPresentationVariant(applied), 'atelier-editorial');
  assert.equal(context.result.applyBuilderSnapshot('{invalid'), false);
  assert.equal(context.result.applyBuilderSnapshot(second), true);
  assert.equal(contract.getStorefrontPresentationVariant(applied), 'atelier-editorial');
});
test('existing draft queue serializes Atelier, preserves conflict state and isolates tenant queues', async () => {
  const {
    createDraftWriteQueue
  } = await import(pathToFileURL(path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/draftWriteQueue.js')));
  const drafts = new Map(),
    calls = [];
  const queueFor = shop => createDraftWriteQueue({
    initialVersion: null,
    save: async payload => {
      calls.push(shop);
      const current = drafts.get(shop);
      if (payload.expectedDraftUpdatedAt !== (current?.updatedAt || null)) throw Object.assign(new Error('Conflict'), {
        status: 409
      });
      const saved = {
        ...payload,
        updatedAt: 'v' + calls.length
      };
      drafts.set(shop, saved);
      return saved;
    }
  });
  const a = queueFor('tenant-a'),
    b = queueFor('tenant-b');
  await a.save({
    theme: candidate()
  });
  await b.save({
    theme: prebuilt.resolvePrebuiltTheme({
      presetId: 'modern-general',
      appliedAt: at
    })
  });
  assert.equal(contract.getStorefrontPresentationVariant(drafts.get('tenant-a').theme), 'atelier-editorial');
  assert.equal(contract.getStorefrontPresentationVariant(drafts.get('tenant-b').theme), 'default');
  const prior = drafts.get('tenant-a');
  drafts.set('tenant-a', {
    ...prior,
    updatedAt: 'external'
  });
  await assert.rejects(a.save({
    theme: {}
  }), /Conflict/);
  assert.equal(drafts.get('tenant-a').theme.presentationVariant, 'atelier-editorial');
  await a.pause();
  assert.equal(await a.save({
    theme: {}
  }), null);
  a.resetVersion('external');
  a.resume();
  await a.save({
    theme: candidate()
  });
  a.close();
  b.close();
});
test('preview iframe remains scriptless and viewport export/installed packages match the shared source', () => {
  const frame = fs.readFileSync(path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreviewFrame.jsx'), 'utf8');
  assert.match(frame, /sandbox="allow-same-origin"/);
  assert.ok(!frame.includes('allow-scripts'));
  assert.match(frame, /MutationObserver/);
  assert.match(frame, /ResizeObserver/);
  const expected = fs.realpathSync(path.join(root, 'packages/storefront-renderer/viewports.js'));
  for (const app of ['ecommerce-admin', 'ecommerce-storefront']) {
    const req = Module.createRequire(path.join(root, app, 'package.json'));
    assert.equal(fs.realpathSync(req.resolve('@scaleup/storefront-renderer/viewports')), expected);
    assert.equal(fs.realpathSync(req.resolve('@scaleup/storefront-theme')), fs.realpathSync(path.join(root, 'packages/storefront-theme/index.cjs')));
  }
});

// Actual persistence service + adoption guard, with Mongoose I/O replaced by
// disposable in-memory records. This is deliberately a unit test, not MongoDB proof.
function isolatedPublication(t) {
  const Shop = require('../models/Shop');
  const ids = ['100000000000000000000001', '100000000000000000000002'];
  const json = value => JSON.parse(JSON.stringify(value));
  const initial = prebuilt.resolvePrebuiltTheme({
    presetId: 'modern-general',
    appliedAt: at
  });
  const shops = new Map(ids.map((id, index) => [id, {
    _id: id,
    shopName: 'Synthetic tenant ' + index,
    subdomain: 'synthetic-' + index,
    theme: initial,
    themeRevision: 0,
    searchAliases: []
  }]));
  const drafts = new Map(),
    revisions = new Map(),
    writes = [];
  const full = {
    storeBuilderAccess: 'full',
    planKey: 'test-plan'
  };
  for (const [key, value] of Object.entries({
    ATELIER_EDITORIAL_ROLLOUT: 'allowlist',
    ATELIER_EDITORIAL_TEST_SHOP_IDS: ids[0],
    ATELIER_EDITORIAL_APPROVED_PLAN_KEYS: ''
  })) {
    const before = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (before === undefined) delete process.env[key];else process.env[key] = before;
    });
  }
  const query = value => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    lean: async () => json(value),
    then(resolve, reject) {
      return Promise.resolve(json(value)).then(resolve, reject);
    }
  });
  const load = (filename, deps) => {
    const target = path.join(root, 'ecommerce-backend/backend/services/storeBuilder', filename);
    const loaded = new Module(target, module);
    loaded.require = id => Object.hasOwn(deps, id) ? deps[id] : {};
    loaded._compile(fs.readFileSync(target, 'utf8'), target);
    return loaded.exports;
  };
  const billing = {
    getShopPlanAccess: async () => full
  };
  const guard = load('themeAvailabilityService.js', {
    '@scaleup/storefront-theme': contract,
    '../billing/planAccessService': billing
  });
  const deps = {
    mongoose: {
      connection: {}
    },
    '@scaleup/storefront-theme': contract,
    '../../models/Shop': {
      schema: Shop.schema,
      findById: id => query(shops.get(String(id)) || null),
      findOneAndUpdate: (filter, update) => {
        const current = shops.get(String(filter._id));
        const expected = filter.themeRevision ?? 0;
        if (!current || current.themeRevision !== expected) return query(null);
        const doc = new Shop({
          ...current,
          ...update.$set
        });
        assert.equal(doc.validateSync(), undefined);
        shops.set(String(filter._id), json(doc.toObject()));
        writes.push({
          type: 'shop',
          shop: String(filter._id)
        });
        return query(shops.get(String(filter._id)));
      }
    },
    '../../models/StoreBuilderDraft': {
      findOneAndUpdate: async (filter, update, options) => {
        const existing = drafts.get(String(filter.shop_id));
        const equal = existing && +new Date(existing.updatedAt) === +new Date(filter.updatedAt);
        if (existing && !equal) {
          if (options.upsert) throw Object.assign(new Error('Unique tenant draft'), {
            code: 11000
          });
          return null;
        }
        if (!existing && !options.upsert) return null;
        const row = {
          _id: 'draft-' + filter.shop_id,
          ...json(update.$set)
        };
        drafts.set(String(filter.shop_id), row);
        writes.push({
          type: 'draft',
          shop: String(filter.shop_id)
        });
        return {
          ...row,
          toObject: () => json(row)
        };
      },
      deleteOne: async filter => drafts.delete(String(filter.shop_id))
    },
    '../../models/StoreBuilderRevision': {
      create: async rows => {
        const row = {
          ...json(rows[0]),
          _id: 'revision-' + rows[0].shop_id + '-' + rows[0].revision
        };
        revisions.set(row._id, row);
        return [row];
      },
      find: () => query([]),
      findOne: filter => {
        const row = revisions.get(String(filter._id));
        return query(row && String(row.shop_id) === String(filter.shop_id) ? row : null);
      },
      deleteOne: async () => {}
    },
    './themeCompatibilityService': require('../services/storeBuilder/themeCompatibilityService'),
    './themeAvailabilityService': guard,
    './draftConcurrency': require('../services/storeBuilder/draftConcurrency'),
    '../billing/planAccessService': billing,
    '../billing/storeBuilderPlanService': contract,
    '../themeSectionService': {
      ensureThemeSectionArchitecture: async () => {}
    },
    '../policies/defaultPolicyTemplates': contract,
    './storeBuilderAssetService': {
      assertThemeAssetOwnership: async () => {},
      attachAssetsToDraft: async () => {},
      promotePublishedAssets: async () => {}
    },
    '../auditLogService': {
      logAudit: async () => {}
    },
    '../logger': {
      warn: () => assert.fail('Unexpected publication warning')
    }
  };
  return {
    service: load('storeBuilderService.js', deps),
    shops,
    drafts,
    revisions,
    writes,
    ids
  };
}
test('authorized Atelier draft → publish → JSON reload → switch away → restore passes actual service guards', async t => {
  const f = isolatedPublication(t),
    shopId = f.ids[0];
  const draft = await f.service.saveStoreBuilderDraft({
    shopId,
    theme: candidate(),
    basedOnRevision: 0,
    expectedDraftUpdatedAt: null
  });
  assert.equal(draft.theme.presentationVariant, 'atelier-editorial');
  await assert.rejects(f.service.saveStoreBuilderDraft({
    shopId,
    theme: candidate(),
    basedOnRevision: 0,
    expectedDraftUpdatedAt: null
  }), {
    code: 'DRAFT_CONFLICT'
  });
  const published = await f.service.publishStoreBuilder({
    shopId,
    theme: draft.theme,
    expectedRevision: 0
  });
  assert.equal(published.themeRevision, 1);
  assert.equal(f.drafts.has(shopId), false);
  const revisionId = [...f.revisions.keys()][0];
  const legacy = prebuilt.resolvePrebuiltTheme({
    currentTheme: published.theme,
    presetId: 'modern-general',
    appliedAt: at
  });
  await f.service.publishStoreBuilder({
    shopId,
    theme: legacy,
    expectedRevision: 1
  });
  assert.equal(contract.getStorefrontPresentationVariant(f.shops.get(shopId).theme), 'default');
  const restored = await f.service.restoreStoreBuilderRevision({
    shopId,
    revisionId,
    expectedRevision: 2
  });
  assert.equal(restored.themeRevision, 3);
  assert.equal(restored.theme.presentationVariant, 'atelier-editorial');
  assert.deepEqual(restored.theme.policies, published.theme.policies);
  assert.equal(f.shops.get(f.ids[1]).themeRevision, 0);
});
test('unapproved tenant, foreign revision and stale publish cannot mutate another tenant in the service unit harness', async t => {
  const f = isolatedPublication(t),
    [a, b] = f.ids;
  await assert.rejects(f.service.saveStoreBuilderDraft({
    shopId: b,
    theme: candidate(),
    basedOnRevision: 0,
    expectedDraftUpdatedAt: null,
    planAccess: {
      storeBuilderAccess: 'full',
      rollout: 'on'
    }
  }), {
    code: 'THEME_NOT_AVAILABLE'
  });
  await f.service.publishStoreBuilder({
    shopId: a,
    theme: candidate(),
    expectedRevision: 0
  });
  const revisionId = [...f.revisions.keys()][0];
  assert.equal(await f.service.restoreStoreBuilderRevision({
    shopId: b,
    revisionId,
    expectedRevision: 0
  }), null);
  const writes = f.writes.length;
  await assert.rejects(f.service.publishStoreBuilder({
    shopId: a,
    theme: {},
    expectedRevision: 0
  }), {
    code: 'THEME_CONFLICT'
  });
  assert.equal(f.writes.length, writes);
  assert.equal(f.shops.get(b).themeRevision, 0);
});
test('pilot recovery works with adoption off without relying on a retained old revision', async t => {
  const f = isolatedPublication(t),
    shopId = f.ids[0];
  const active = await f.service.publishStoreBuilder({
    shopId,
    theme: candidate(),
    expectedRevision: 0
  });
  const backup = JSON.parse(JSON.stringify(active));
  f.revisions.clear();
  process.env.ATELIER_EDITORIAL_ROLLOUT = 'off';
  await f.service.publishStoreBuilder({
    shopId,
    theme: {
      ...active.theme,
      footer: {
        ...active.theme.footer,
        text: 'Updated merchant content'
      }
    },
    expectedRevision: 1
  });
  const latest = f.shops.get(shopId);
  const recovery = prebuilt.resolvePrebuiltTheme({
    currentTheme: latest.theme,
    presetId: 'modern-general',
    appliedAt: at
  });
  const recovered = await f.service.publishStoreBuilder({
    shopId,
    theme: recovery,
    expectedRevision: 2
  });
  assert.equal(contract.getStorefrontPresentationVariant(recovered.theme), 'default');
  assert.equal(recovered.theme.footer.text, 'Updated merchant content');
  assert.equal(backup.theme.presentationVariant, 'atelier-editorial');
});
test('Atelier gallery awaits application, blocks duplicate clicks and retains a rejected draft', async t => {
  const render = localComponentState(t);
  const refs = [];
  let refIndex = 0;
  t.mock.method(h.React, 'useRef', value => refs[refIndex++] ||= {
    current: value
  });
  t.mock.method(h.React, 'useMemo', callback => callback());
  t.mock.method(h.React, 'useEffect', () => {});
  let calls = 0,
    closed = 0,
    finish;
  const props = {
    open: true,
    currentTheme: prebuilt.resolvePrebuiltTheme({
      presetId: 'modern-general',
      appliedAt: at
    }),
    themeAvailability: {
      'atelier-editorial': {
        available: true
      }
    },
    planAccess: {
      storeBuilderAccess: 'full'
    },
    products: [],
    categories: [],
    reviews: [],
    onClose() {
      closed++;
    },
    onApply() {
      calls++;
      return new Promise(resolve => {
        finish = resolve;
      });
    }
  };
  const renderGallery = () => {
    refIndex = 0;
    return render(() => h.ui.ThemeGallery(props));
  };
  const find = (tree, name) => {
    let found;
    walk(tree, node => {
      if (node.type?.name === name) found = node;
    });
    assert.ok(found, name);
    return found;
  };
  let tree = renderGallery(),
    card;
  walk(tree, node => {
    if (node.type?.name === 'ThemeCard' && node.props.theme.id === 'atelier-editorial') card = node;
  });
  assert.ok(card);
  card.props.onUse(card.props.theme);
  tree = renderGallery();
  const applying = find(tree, 'ApplyThemeDialog').props.onConfirm();
  tree = renderGallery();
  assert.equal(find(tree, 'ApplyThemeDialog').props.busy, true);
  await find(tree, 'ApplyThemeDialog').props.onConfirm();
  assert.equal(calls, 1);
  finish(false);
  await applying;
  tree = renderGallery();
  assert.equal(find(tree, 'ApplyThemeDialog').props.busy, false);
  assert.equal(closed, 0);
  let alert;
  walk(tree, node => {
    if (node.props?.role === 'alert') alert = node;
  });
  assert.ok(alert);
  props.themeAvailability = {};
  tree = renderGallery();
  await find(tree, 'ApplyThemeDialog').props.onConfirm();
  assert.equal(calls, 1, 'Revocation prevents a second apply callback');
});
