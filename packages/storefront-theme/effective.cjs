// Pure resolution stages. Environment/tenant loading belongs in server adapters.
const { fillMissingPolicyDefaults } = require('./policies.cjs');
module.exports = ({ normalizeTheme, mergeThemePatch, FALLBACK_THEME, cloneTheme, THEME_SCHEMA_VERSION }) => {
    const getPublicThemeForPlan = (theme = {}, planAccess = {}) => {
        if (planAccess?.storeBuilderAccess === 'full') return theme;

        if (planAccess?.storeBuilderAccess === 'none') {
            const normalized = normalizeTheme(theme);
            const defaults = cloneTheme(FALLBACK_THEME);

            return normalizeTheme({
                ...defaults,
                logoUrl: normalized.logoUrl,
                faviconUrl: normalized.faviconUrl,
                checkoutBranding: {
                    ...defaults.checkoutBranding,
                    logoUrl: normalized.logoUrl
                },
                paymentSettings: normalized.paymentSettings,
                footer: {
                    ...defaults.footer,
                    text: normalized.footer?.text || '',
                    contactLabel: normalized.footer?.contactLabel || defaults.footer.contactLabel,
                    contactEmail: normalized.footer?.contactEmail || '',
                    facebookUrl: normalized.footer?.facebookUrl || '',
                    instagramUrl: normalized.footer?.instagramUrl || '',
                    twitterUrl: normalized.footer?.twitterUrl || '',
                    youtubeUrl: normalized.footer?.youtubeUrl || '',
                    tiktokUrl: normalized.footer?.tiktokUrl || '',
                    links: []
                },
                policies: normalized.policies
            });
        }

        return {
            ...theme,
            homepageSections: (Array.isArray(theme.homepageSections) ? theme.homepageSections : [])
                .filter(section => section?.type === 'FeaturedProducts')
        };
    };

    const applyBrandingToPublicTheme = ({ theme = {}, branding, storeBuilderEnabled = false }) => {
        if (!branding) return theme;

        if (storeBuilderEnabled) {
            const hero = theme.hero || {};
            const hasPremiumHero = Boolean(
                hero.imageUrl ||
                hero.title ||
                (Array.isArray(hero.bannerSlides) && hero.bannerSlides.some(slide => (
                    slide?.desktopImage || slide?.mobileImage || slide?.title
                )))
            );
            return {
                ...theme,
                logoUrl: theme.logoUrl || branding.logoUrl,
                faviconUrl: theme.faviconUrl || branding.faviconUrl,
                hero: hasPremiumHero ? hero : {
                    ...hero,
                    title: branding.heroTitle,
                    subtitle: branding.heroSubtitle,
                    imageUrl: branding.heroImageUrl,
                    ctaLabel: branding.heroCta?.label || '',
                    ctaUrl: branding.heroCta?.url || '',
                    hidden: branding.heroHidden
                }
            };
        }

        const ctaLabel = branding.heroCta?.label || '';
        const ctaUrl = branding.heroCta?.url || '';
        return {
            ...theme,
            logoUrl: branding.logoUrl || '',
            faviconUrl: branding.faviconUrl || '',
            hero: {
                ...(theme.hero || {}),
                title: branding.heroTitle,
                subtitle: branding.heroSubtitle,
                imageUrl: branding.heroImageUrl || '',
                ctaLabel,
                ctaUrl,
                hidden: branding.heroHidden,
                height: branding.heroImageUrl ? 'Medium' : 'Compact',
                bannerSlides: [{
                    id: 'essential-branding-hero',
                    enabled: true,
                    desktopImage: branding.heroImageUrl || '',
                    mobileImage: branding.heroImageUrl || '',
                    title: branding.heroTitle,
                    subtitle: branding.heroSubtitle,
                    badgeText: '',
                    discountText: '',
                    primaryCtaText: ctaLabel,
                    primaryCtaLink: ctaUrl,
                    secondaryCtaText: '',
                    secondaryCtaLink: ''
                }]
            }
        };
    };

    // This is an input contract, not a second persisted theme format. A legacy flat
    // snapshot is an override document: even a value equal to a default is explicit.
    const createThemeInput = (storedTheme = {}, { defaults = {}, overrides = {} } = {}) => ({
        version: Number(storedTheme?.version) || 1,
        // Merge raw JSON before normalization. Sanitizing a partial SEO object first
        // materializes empty siblings and would turn omitted values into overrides.
        defaults: mergeThemePatch({}, cloneTheme(defaults)),
        overrides: mergeThemePatch(cloneTheme(storedTheme), cloneTheme(overrides)),
    });

    const assertSupportedThemeVersion = (theme = {}) => {
        if (theme.version !== undefined && (!Number.isInteger(Number(theme.version)) || Number(theme.version) < 1 || Number(theme.version) > THEME_SCHEMA_VERSION)) {
            const error = new Error('This theme uses an unsupported schema version. Update the application before editing it.');
            error.code = 'UNSUPPORTED_THEME_VERSION';
            error.statusCode = 409;
            throw error;
        }
    };

    const resolveEffectiveTheme = (candidate = {}, context = {}) => {
        const input = createThemeInput(candidate, context);
        let theme = normalizeTheme(mergeThemePatch(input.defaults, input.overrides));
        // Missing plan context means this is already effective data or an editor
        // snapshot, not an implicit downgrade to the limited plan.
        if (context.planAccess) theme = getPublicThemeForPlan(theme, context.planAccess);
        theme = applyBrandingToPublicTheme({
            theme,
            branding: context.branding,
            storeBuilderEnabled: context.planAccess?.features?.storeBuilder
                ?? (context.planAccess?.storeBuilderAccess !== 'none'),
        });
        theme.policies = fillMissingPolicyDefaults(theme.policies, { storeName: context.shopName }).policies;
        // The canonical output carries desktop/tablet/mobile values simultaneously.
        // CSS and shared components select the viewport; resolution never reads window.
        theme = normalizeTheme(theme);
        // Opaque compatibility data is saved by editors, never exposed to public UI.
        delete theme.extensions;
        return theme;
    };
    return { createThemeInput, assertSupportedThemeVersion, resolveEffectiveTheme, getPublicThemeForPlan, applyBrandingToPublicTheme };
};
