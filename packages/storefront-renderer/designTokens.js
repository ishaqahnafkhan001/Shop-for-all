const BASE_CONTAINER_CLASS = "mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 2xl:px-10";

const CONTAINER_WIDTH_CLASSES = Object.freeze({
    Narrow: "max-w-5xl",
    Standard: "max-w-7xl",
    Wide: "max-w-screen-2xl",
    "Full Width": "max-w-none",
});

const LEGACY_CONTAINER_WIDTHS = Object.freeze({
    Contained: "Narrow",
    Wide: "Wide",
    Full: "Full Width",
});

const SECTION_WIDTH_CLASSES = Object.freeze({
    Narrow: "mx-auto w-full max-w-4xl",
    Standard: "mx-auto w-full max-w-6xl",
    Wide: "mx-auto w-full max-w-7xl",
    "Full Width": "w-full",
});

const SECTION_SPACING_CLASSES = Object.freeze({
    Compact: "mt-6 md:mt-8",
    Comfortable: "mt-8 md:mt-12",
    Spacious: "mt-10 md:mt-16",
});

const ALL_PRODUCTS_PADDING_CLASSES = Object.freeze({
    Compact: "py-5 sm:py-8",
    Comfortable: "py-6 sm:py-12",
    Spacious: "py-8 sm:py-16",
    Editorial: "py-8 sm:py-16",
});

const CONTENT_GAP_CLASSES = Object.freeze({
    Compact: "gap-2.5 sm:gap-3",
    Comfortable: "gap-3 sm:gap-4 lg:gap-5",
    Spacious: "gap-4 sm:gap-5 lg:gap-6",
    Editorial: "gap-4 sm:gap-5 lg:gap-6",
});

const CARD_ALIGNMENT = Object.freeze({
    Left: { textClass: "text-left", flexClass: "justify-start" },
    Center: { textClass: "text-center", flexClass: "justify-center" },
    Right: { textClass: "text-right", flexClass: "justify-end" },
});

const DEFAULT_SECTION_BOX = Object.freeze({
    sectionPaddingTop: 40,
    sectionPaddingBottom: 40,
    sectionMarginTop: 0,
    sectionMarginBottom: 40,
});

const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const firstSupported = (values, supported, fallback) => values.find(value => supported[value]) || fallback;

export const resolveContainerWidth = (layout = {}) => firstSupported(
    [layout.containerWidth, LEGACY_CONTAINER_WIDTHS[layout.maxWidth]],
    CONTAINER_WIDTH_CLASSES,
    "Wide"
);

export const getContainerClass = (layout = {}) => (
    `${BASE_CONTAINER_CLASS} ${CONTAINER_WIDTH_CLASSES[resolveContainerWidth(layout)]}`
);

export const resolveSectionWidth = (layout = {}) => firstSupported(
    [layout.sectionWidth],
    SECTION_WIDTH_CLASSES,
    "Full Width"
);

export const getSectionWidthClass = (layout = {}) => SECTION_WIDTH_CLASSES[resolveSectionWidth(layout)];

export const resolveSectionSpacing = (layout = {}) => firstSupported(
    [layout.sectionSpacing, layout.contentSpacing],
    SECTION_SPACING_CLASSES,
    "Comfortable"
);

export const resolveGridSpacing = (...values) => firstSupported(
    values,
    CONTENT_GAP_CLASSES,
    "Comfortable"
);

export const getContentGapClass = (...values) => CONTENT_GAP_CLASSES[resolveGridSpacing(...values)];

export const getAllProductsPaddingClass = (...values) => (
    ALL_PRODUCTS_PADDING_CLASSES[resolveGridSpacing(...values)]
);

export const getSectionLayout = (layout = {}) => {
    const paddingTop = clampNumber(layout.sectionPaddingTop, 0, 160, DEFAULT_SECTION_BOX.sectionPaddingTop);
    const paddingBottom = clampNumber(layout.sectionPaddingBottom, 0, 160, DEFAULT_SECTION_BOX.sectionPaddingBottom);
    const marginTop = clampNumber(layout.sectionMarginTop, 0, 160, DEFAULT_SECTION_BOX.sectionMarginTop);
    const marginBottom = clampNumber(layout.sectionMarginBottom, 0, 160, DEFAULT_SECTION_BOX.sectionMarginBottom);
    const hasCustomPadding = paddingTop !== DEFAULT_SECTION_BOX.sectionPaddingTop
        || paddingBottom !== DEFAULT_SECTION_BOX.sectionPaddingBottom;
    const hasCustomMargins = marginTop !== DEFAULT_SECTION_BOX.sectionMarginTop
        || marginBottom !== DEFAULT_SECTION_BOX.sectionMarginBottom;

    return {
        className: `${getSectionWidthClass(layout)} ${hasCustomMargins ? "" : SECTION_SPACING_CLASSES[resolveSectionSpacing(layout)]}`.trim(),
        style: {
            ...(hasCustomPadding ? { paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` } : {}),
            ...(hasCustomMargins ? { marginTop: `${marginTop}px`, marginBottom: `${marginBottom}px` } : {}),
        },
    };
};

export const resolveProductColumns = ({ desktop, tablet, mobile } = {}) => {
    const safeDesktop = Math.round(clampNumber(desktop, 2, 5, 3));
    const derivedTablet = safeDesktop >= 4 ? 3 : Math.max(2, safeDesktop);
    return {
        desktop: safeDesktop,
        tablet: Math.round(clampNumber(tablet, 1, 4, derivedTablet)),
        mobile: Math.round(clampNumber(mobile, 1, 2, 2)),
    };
};

export const resolveFeaturedProductColumns = (section = {}, layout = {}) => resolveProductColumns({
    desktop: section.desktopSettings?.columns ?? layout.productColumnsDesktop,
    tablet: section.desktopSettings?.tabletColumns,
    mobile: section.mobileSettings?.columns ?? layout.productColumnsMobile,
});

export const resolveAllProductsLayout = (allProducts = {}, layout = {}, legacyGridStyle) => ({
    ...resolveProductColumns({
        desktop: allProducts.desktopColumns ?? layout.productColumnsDesktop,
        tablet: allProducts.tabletColumns,
        mobile: allProducts.mobileColumns ?? layout.productColumnsMobile,
    }),
    spacing: resolveGridSpacing(allProducts.spacing, layout.productGap, legacyGridStyle),
});

export const resolveCardAlignment = (value) => CARD_ALIGNMENT[value] || CARD_ALIGNMENT.Left;

export const resolveHeroOverlayOpacity = (value) => clampNumber(value, 0, 80, 25);

export const headingStyle = Object.freeze({
    fontFamily: "var(--sf-heading-font)",
    fontWeight: "var(--sf-heading-weight)",
});
