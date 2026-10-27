'use strict';

// Capability policy is derived from the existing schema/renderer registries.
// It describes edit commands; it is not another persisted theme format.
module.exports = ({ STRUCTURAL_VARIANTS, SECTION_REGISTRY, HOMEPAGE_COMPOSITIONS,
    getHomepageComposition, normalizeTheme, normalizeHomepageSections, PRODUCT_CARD_STYLE_FIELDS }) => {
    const limitedEditableSections = Object.freeze(['Hero', 'FeaturedProducts']);
    const restrictedKeys = Object.freeze(['layout', 'productGridStyle']);
    const restrictedVariants = Object.freeze([Object.freeze(['header', 'variant']), Object.freeze(['hero', 'variant'])]);
    const safe = { level: 'safe', classification: 'fully-customizable' };
    const structural = { level: 'structural', classification: 'partially-customizable' };
    const identity = { level: 'identity', classification: 'theme-controlled', commandOnly: true };
    const locked = { level: 'identity', classification: 'locked', commandOnly: true };
    const responsive = { level: 'structural', classification: 'responsive-only' };
    const rules = Object.freeze(Object.fromEntries(Object.entries({
        logoUrl: safe, faviconUrl: safe, colors: safe, fontFamily: safe, typography: safe,
        hero: safe, 'hero.variant': structural, 'hero.bannerSlides.*.mobileImage': responsive,
        header: structural, 'header.logoPosition': locked, 'header.menuStyle': locked,
        layout: structural, 'layout.homepageComposition': identity,
        'layout.sectionPaddingTop': safe, 'layout.sectionPaddingBottom': safe,
        'layout.sectionMarginTop': safe, 'layout.sectionMarginBottom': safe,
        'layout.contentSpacing': safe, 'layout.sectionSpacing': safe,
        'layout.productColumnsMobile': responsive, 'layout.productColumnsTablet': responsive, productGridStyle: structural,
        productCard: safe, 'productCard.style': structural, 'productCard.inheritedStyleFields': identity,
        navigation: structural, footer: structural, allProducts: structural,
        'allProducts.tabletColumns': responsive, 'allProducts.mobileColumns': responsive,
        checkoutBranding: safe, mobile: responsive, paymentSettings: structural,
        'mobile.stickyCheckoutButton': { ...locked, reason: 'Sticky checkout customization is not available.' },
        policies: safe, seo: safe, 'seo.aiSuggestion': locked,
        homepageSections: structural,
        'homepageSections.*': { level: 'safe', classification: 'section-specific' },
        'homepageSections.*.type': structural, 'homepageSections.*.sortOrder': structural,
        'homepageSections.*.settings.variant': structural,
        'homepageSections.*.desktopSettings': responsive, 'homepageSections.*.mobileSettings': responsive,
        'homepageSections.*.settings.mobileImage': responsive, 'homepageSections.*.settings.mobileImages': responsive,
        preset: identity, version: locked, migrations: locked, extensions: locked,
    }).map(([path, rule]) => [path, Object.freeze({ ...rule })])));

    const getThemeCapabilityMetadata = (planAccess = {}) => {
        const access = ['full', 'none'].includes(planAccess.storeBuilderAccess) ? planAccess.storeBuilderAccess : 'limited';
        const full = access === 'full';
        const planName = planAccess.planName || planAccess.planKey || 'your current plan';
        const availability = (enabled, label) => ({ enabled, label: enabled ? 'Available' : label });
        return {
            access, planName,
            editing: availability(access !== 'none', 'Store Builder is not included in the current plan.'),
            sections: availability(full, `Requires a plan with advanced homepage sections (current: ${planName})`),
            advancedDesign: availability(full, `Requires full Store Builder access (current: ${planName})`),
            customDomain: availability(planAccess.features?.customDomain !== false, `Custom domains are not included in ${planName}`),
            scheduledBanners: availability(Boolean(planAccess.storeBuilderCapabilities?.scheduledBanners), `Scheduled banners are not included in ${planName}`),
        };
    };

    const getThemeCapabilities = (theme = {}, planAccess = {}) => {
        const plan = getThemeCapabilityMetadata(planAccess);
        const full = plan.access === 'full';
        const editable = plan.editing.enabled;
        const compositionId = getHomepageComposition(theme.layout?.homepageComposition);
        const composition = HOMEPAGE_COMPOSITIONS[compositionId];
        const variants = contract => ({ allowed: [...contract.values], merchantSelectable: full, reason: full ? '' : plan.advancedDesign.label });
        const sections = Object.fromEntries(Object.entries(SECTION_REGISTRY).map(([type, definition]) => [type, {
            editable: editable && (full || limitedEditableSections.includes(type)),
            addable: full && definition.editorEnabled,
            variants: STRUCTURAL_VARIANTS.sections[type] ? variants(STRUCTURAL_VARIANTS.sections[type]) : null,
        }]));
        return {
            plan,
            composition: { id: compositionId, label: composition.label, classification: 'theme-controlled',
                merchantSelectable: false, changeCommand: 'apply-theme',
                slots: Object.fromEntries(Object.entries(composition.slots).map(([slot, types]) => [slot, [...types]])),
                orderingHelp: Object.keys(composition.slots).length
                    ? 'The first eligible section for each theme slot occupies that position. Other sections follow your list order. Hidden or empty sections do not reserve a slot.'
                    : 'Sections follow your list order between the hero and catalog.',
            },
            header: variants(STRUCTURAL_VARIANTS.header), hero: variants(STRUCTURAL_VARIANTS.hero),
            sections, sectionStructure: { editable: full, reason: full ? '' : plan.sections.label },
            layout: { editable: full, reason: full ? '' : plan.advancedDesign.label },
            // Colors and mobile toggles have always been accepted by save validation.
            colors: { editable }, mobile: { editable },
        };
    };

    const getThemePropertyCapability = (path, { theme = {}, planAccess = {}, sectionType } = {}) => {
        const normalizedPath = String(path).replace(/\.\d+(?=\.|$)/g, '.*');
        const match = Object.keys(rules).filter(key => normalizedPath === key || normalizedPath.startsWith(`${key}.`))
            .sort((a, b) => b.length - a.length)[0];
        const rule = rules[match] || locked;
        const capabilities = getThemeCapabilities(theme, planAccess);
        const root = normalizedPath.split('.')[0];
        let allowedByPlan = capabilities.plan.editing.enabled;
        if (restrictedKeys.includes(root) || restrictedVariants.some(parts => parts.join('.') === normalizedPath)) {
            allowedByPlan = capabilities.plan.access === 'full';
        }
        if (root === 'homepageSections') {
            const index = Number(String(path).split('.')[1]);
            const type = sectionType || theme.homepageSections?.[index]?.type;
            allowedByPlan = capabilities.sections[type]?.editable === true;
            if (normalizedPath === root || /\.(type|sortOrder)$/.test(normalizedPath)) allowedByPlan = capabilities.sectionStructure.editable;
        }
        const inherited = root === 'productCard' && PRODUCT_CARD_STYLE_FIELDS.includes(normalizedPath.split('.')[1])
            && theme.productCard?.inheritedStyleFields?.includes(normalizedPath.split('.')[1]);
        let allowed;
        if (normalizedPath === 'header.variant') allowed = capabilities.header.allowed;
        if (normalizedPath === 'hero.variant') allowed = capabilities.hero.allowed;
        if (normalizedPath === 'layout.homepageComposition') allowed = [...STRUCTURAL_VARIANTS.homepage.values];
        if (normalizedPath === 'homepageSections.*.settings.variant') {
            const type = sectionType || theme.homepageSections?.[Number(String(path).split('.')[1])]?.type;
            allowed = capabilities.sections[type]?.variants?.allowed;
        }
        return { ...rule, classification: inherited ? 'inherited' : rule.classification,
            merchantEditable: allowedByPlan && !rule.commandOnly, allowedByPlan, ...(allowed ? { allowed } : {}) };
    };

    const getThemeEditorRestriction = (group, { theme = {}, planAccess = {}, sectionIndex = -1 } = {}) => {
        const caps = getThemeCapabilities(theme, planAccess);
        if (!caps.plan.editing.enabled) return caps.plan.editing.label;
        if (group === 'layout' && !caps.layout.editable) return caps.layout.reason;
        if (group === 'sections' && !caps.sections[theme.homepageSections?.[sectionIndex]?.type]?.editable
            && !caps.sectionStructure.editable) return caps.sectionStructure.reason;
        return '';
    };

    const deepEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
    const assertStoreBuilderUpdateAllowed = ({ currentTheme = {}, incomingTheme = {}, planAccess = {}, completeSnapshot = false }) => {
        if (!incomingTheme) return;
        const caps = getThemeCapabilities(currentTheme, planAccess);
        const reject = (message, capability) => {
            const error = new Error(message);
            error.statusCode = 403;
            error.code = capability ? 'STORE_BUILDER_CAPABILITY_REQUIRED' : 'FEATURE_NOT_INCLUDED';
            if (capability) error.capability = capability;
            else error.feature = 'storeBuilder';
            throw error;
        };
        if (!caps.plan.editing.enabled) reject(caps.plan.editing.label);
        if (caps.plan.access === 'full') return;
        const current = normalizeTheme(currentTheme);
        const incoming = normalizeTheme(incomingTheme);
        for (const key of restrictedKeys) {
            if ((completeSnapshot || incomingTheme[key] !== undefined) && !deepEqual(incoming[key], current[key])) reject(caps.layout.reason, 'advancedDesign');
        }
        for (const [group, key] of restrictedVariants) {
            if ((completeSnapshot || incomingTheme[group]?.[key] !== undefined) && !deepEqual(incoming[group]?.[key], current[group]?.[key])) reject(caps.layout.reason, 'advancedDesign');
        }
        if (completeSnapshot || Array.isArray(incomingTheme.homepageSections)) {
            const before = normalizeHomepageSections(completeSnapshot ? current.homepageSections : currentTheme.homepageSections);
            const after = normalizeHomepageSections(completeSnapshot ? incoming.homepageSections : incomingTheme.homepageSections);
            if (!deepEqual(before.map(section => section.id), after.map(section => section.id))) reject(caps.sectionStructure.reason, 'sectionReordering');
            after.forEach((section, index) => {
                const previous = before[index];
                // Check both ends: changing an advanced section's type cannot bypass its restriction.
                if (!deepEqual(section, previous) && (section.type !== previous?.type
                    || !limitedEditableSections.includes(section.type) || !limitedEditableSections.includes(previous?.type))) {
                    reject(caps.plan.sections.label, 'advancedSections');
                }
            });
        }
    };

    return { THEME_CAPABILITY_RULES: rules, LIMITED_EDITABLE_SECTION_TYPES: limitedEditableSections,
        RESTRICTED_THEME_KEYS: restrictedKeys, RESTRICTED_VARIANT_PATHS: restrictedVariants,
        getThemeCapabilities, getThemePropertyCapability, getThemeEditorRestriction, getThemeCapabilityMetadata,
        assertStoreBuilderUpdateAllowed };
};
