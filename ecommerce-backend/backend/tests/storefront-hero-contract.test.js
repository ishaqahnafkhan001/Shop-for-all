const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { normalizeTheme } = require('@scaleup/storefront-theme');

const repoRoot = path.resolve(__dirname, '../../..');
let consumers;
let renderHero;
test.before(async () => {
    // Execute the actual JSX consumers using the admin's installed bundler.
    const filename = path.join(repoRoot, 'ecommerce-admin/hero-contract-test.cjs');
    const adminRequire = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(adminRequire.resolve('rolldown')).href);
    const builder = path.join(repoRoot, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js');
    const renderer = path.join(repoRoot, 'packages/storefront-renderer/reference/referenceCore.jsx');
    const heroRenderer = path.join(repoRoot, 'packages/storefront-renderer/reference/StorefrontHero.jsx');
    const bundle = await rolldown({
        input: 'hero-contract-fixture',
        platform: 'node',
        external: ['lucide-react', 'react', 'react/jsx-runtime'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(repoRoot, 'packages/storefront-theme/index.mjs') } },
        plugins: [{
            name: 'hero-contract-fixture',
            resolveId: id => id === 'hero-contract-fixture' ? '\0hero-contract-fixture' : null,
            load: id => id === '\0hero-contract-fixture' ?
                `export { normalizeHeroSlideForBuilder, syncHeroLegacyFields } from ${JSON.stringify(builder)};
                 export { normalizeHeroSlide } from ${JSON.stringify(renderer)};
                 export { StorefrontHero } from ${JSON.stringify(heroRenderer)};` : null,
        }],
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        consumers = compiled.exports;
        const { createElement } = adminRequire('react');
        const { renderToStaticMarkup } = adminRequire('react-dom/server');
        renderHero = props => renderToStaticMarkup(createElement(consumers.StorefrontHero, props));
    } finally {
        await bundle.close();
    }
});

const legacyHero = {
    title: 'Legacy title', subtitle: 'Legacy subtitle', imageUrl: '/legacy.webp',
    ctaLabel: 'Legacy CTA', ctaUrl: '/legacy',
};

test('absent hero fields inherit legacy values only on the first slide', () => {
    const theme = normalizeTheme({ hero: { ...legacyHero, bannerSlides: [{ id: 'one' }, { id: 'two' }] } });
    assert.equal(theme.hero.bannerSlides[0].title, legacyHero.title);
    assert.equal(theme.hero.bannerSlides[0].desktopImage, legacyHero.imageUrl);
    assert.equal(theme.hero.bannerSlides[1].title, '');
    assert.equal(theme.hero.bannerSlides[1].desktopImage, '');
    assert.equal(normalizeTheme({ hero: legacyHero }).hero.bannerSlides.length, 1);
});

test('explicit empty hero strings stay cleared through repeated normalization', () => {
    const cleared = { id: 'one', title: '', subtitle: '', desktopImage: '', mobileImage: '',
        primaryCtaText: '', primaryCtaLink: '', secondaryCtaText: '', secondaryCtaLink: '' };
    const theme = normalizeTheme({ hero: { ...legacyHero, bannerSlides: [cleared] } });
    for (const key of Object.keys(cleared).filter(key => key !== 'id')) {
        assert.equal(theme.hero.bannerSlides[0][key], '', key);
    }
    assert.equal(theme.hero.imageUrl, '');
    assert.equal(theme.hero.ctaLabel, '');
    assert.equal(theme.hero.ctaUrl, '');
    assert.deepEqual(normalizeTheme(theme), theme);
});

test('an explicit empty slide array is not repopulated from the legacy image', () => {
    const theme = normalizeTheme({ hero: { ...legacyHero, bannerSlides: [] } });
    assert.deepEqual(theme.hero.bannerSlides, []);
    assert.deepEqual(normalizeTheme(theme), theme);
});

test('Builder, shared renderer, and contract preserve zero coordinates and false flags', () => {
    const input = { id: 'one', enabled: false, desktopFocalPoint: { x: 0, y: 100 }, mobileFocalPoint: { x: 100, y: 0 } };
    const canonical = normalizeTheme({ hero: { bannerSlides: [input] } }).hero.bannerSlides[0];
    for (const resolve of [consumers.normalizeHeroSlideForBuilder, consumers.normalizeHeroSlide]) {
        const actual = resolve(canonical);
        assert.equal(actual.enabled, false);
        assert.deepEqual(actual.desktopFocalPoint, input.desktopFocalPoint);
        assert.deepEqual(actual.mobileFocalPoint, input.mobileFocalPoint);
    }
});

test('Builder synchronization preserves explicit image and CTA clears', () => {
    const input = { id: 'one', desktopImage: '', primaryCtaText: '', primaryCtaLink: '', secondaryCtaLink: '' };
    const slide = consumers.normalizeHeroSlideForBuilder(input, 0, legacyHero);
    const synced = consumers.syncHeroLegacyFields(legacyHero, [slide]);
    assert.equal(slide.desktopImage, '');
    assert.equal(slide.secondaryCtaLink, '');
    assert.equal(synced.imageUrl, '');
    assert.equal(synced.ctaLabel, '');
    assert.equal(synced.ctaUrl, '');
    const normalized = normalizeTheme({ hero: synced }).hero.bannerSlides[0];
    assert.equal(normalized.desktopImage, '');
    assert.equal(normalized.primaryCtaText, '');
});

test('null inherits nonnullable hero fields while existing nullable metadata can clear', () => {
    const theme = normalizeTheme({
        preset: null, seo: { socialImageAssetId: null },
        hero: { ...legacyHero, bannerSlides: [{ title: null, desktopImage: null, primaryCtaText: null,
            desktopFocalPoint: { x: null, y: 0 } }] },
    });
    assert.equal(theme.preset, null);
    assert.equal(theme.seo.socialImageAssetId, null);
    assert.equal(theme.hero.bannerSlides[0].title, legacyHero.title);
    assert.equal(theme.hero.bannerSlides[0].primaryCtaText, legacyHero.ctaLabel);
    assert.deepEqual(theme.hero.bannerSlides[0].desktopFocalPoint, { x: 50, y: 0 });
});

test('Builder preserves typing whitespace and contract still sanitizes stored content', () => {
    const slide = consumers.normalizeHeroSlideForBuilder({ title: 'Hello ', primaryCtaText: 'Shop ' });
    assert.equal(slide.title, 'Hello ');
    assert.equal(slide.primaryCtaText, 'Shop ');
    const normalized = normalizeTheme({ hero: { bannerSlides: [{ ...slide, desktopImage: 'javascript:alert(1)' }] } });
    assert.equal(normalized.hero.bannerSlides[0].title, 'Hello');
    assert.equal(normalized.hero.bannerSlides[0].desktopImage, '#');
});

test('already normalized legacy slides retain explicit values in both consumers', () => {
    const slide = normalizeTheme({ hero: { bannerSlides: [{
        id: 'legacy', title: 'Saved title', badgeText: 'Saved badge', desktopImage: '/saved.webp',
        primaryCtaText: 'Shop Now', primaryCtaLink: '/', desktopFocalPoint: { x: 35, y: 70 },
    }] } }).hero.bannerSlides[0];
    assert.deepEqual(consumers.normalizeHeroSlideForBuilder(slide), slide);
    assert.deepEqual(consumers.normalizeHeroSlide(slide), slide);
});

test('all hero variants render cleared copy and links without reviving legacy values', () => {
    for (const variant of ['fullBleed', 'centered', 'split', 'editorial', 'minimal']) {
        for (const previewDevice of [undefined, 'desktop', 'mobile']) {
            const theme = normalizeTheme({ hero: { ...legacyHero, variant, bannerSlides: [{
                title: '', subtitle: '', primaryCtaText: '', primaryCtaLink: '',
                secondaryCtaText: 'Secondary label', secondaryCtaLink: '',
                desktopImage: '/kept.webp', desktopFocalPoint: { x: 0, y: 100 },
                mobileFocalPoint: { x: 100, y: 0 },
            }] } });
            const markup = renderHero({ theme, shopName: 'Fixture Shop', previewDevice });
            assert.doesNotMatch(markup, /Legacy title|Legacy subtitle|Legacy CTA|Secondary label/);
            assert.match(markup, /class="sr-only">Fixture Shop<\/h1>/);
            assert.match(markup, previewDevice === 'mobile'
                ? /object-position:100% 0%/
                : previewDevice === 'desktop' ? /object-position:0% 100%/ : /--hero-desktop-position:0% 100%/);
        }
    }
});
