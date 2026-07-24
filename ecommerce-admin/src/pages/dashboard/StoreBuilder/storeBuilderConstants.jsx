import {
    CreditCard,
    FileText,
    LayoutTemplate,
    Link as LinkIcon,
    Palette,
    Search,
    ShoppingBag,
    Smartphone
} from 'lucide-react';
import { SECTION_REGISTRY } from '@scaleup/storefront-theme';

export const HISTORY_LIMIT = 30;
export const HERO_SLIDE_LIMIT = 5;

export const inlineSectionPresets = [
    {
        templateId: 'featured-products',
        label: 'Featured Products',
        type: 'FeaturedProducts',
        title: 'Featured products',
        description: 'Show a handpicked row of products.',
        useCase: 'Best for best sellers, launches, and seasonal picks.',
        thumbnail: 'grid',
        settings: { visualLabel: 'Featured Products', productIds: [], source: { type: 'manual', productIds: [] } },
        source: { type: 'manual', productIds: [] },
        mobileSettings: { columns: 2, isVisible: true }
    },
    {
        templateId: 'category-showcase',
        label: 'Category Showcase',
        type: 'CategoryList',
        title: 'Shop by category',
        description: 'Help shoppers jump into popular categories.',
        useCase: 'Best for stores with several product families.',
        thumbnail: 'chips',
        settings: { visualLabel: 'Category Showcase', maxCategories: 10, columns: 4 },
        mobileSettings: { columns: 2, isVisible: true }
    },
    {
        templateId: 'image-banner',
        label: 'Image Banner',
        type: 'Banner',
        title: 'Promotional banner',
        description: 'Full-width campaign image with text and button.',
        useCase: 'Best for sales, offers, and collection highlights.',
        thumbnail: 'image',
        settings: { visualLabel: 'Image Banner', desktopImage: '', mobileImage: '', desktopImages: [], mobileImages: [], title: 'Limited offer', subtitle: 'Add a short campaign message.', buttonText: 'Shop now', buttonLink: '/' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'image-text',
        label: 'Image + Text',
        type: 'BrandStory',
        title: 'Brand highlight',
        description: 'Pair a story, benefit, or offer with rich copy.',
        useCase: 'Best for explaining quality, materials, or brand values.',
        thumbnail: 'split',
        settings: { visualLabel: 'Image + Text', text: 'Tell customers why this collection matters.' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'testimonials',
        label: 'Testimonials',
        type: 'Reviews',
        title: 'Customer reviews',
        description: 'Show selected 5-star reviews or a custom quote.',
        useCase: 'Best for trust and social proof.',
        thumbnail: 'quotes',
        settings: { visualLabel: 'Testimonials', mode: 'text', reviewIds: [], text: 'Share customer quotes and social proof.' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'promo-strip',
        label: 'Promo Strip',
        type: 'PromoBlock',
        title: 'Today’s offer',
        description: 'Compact announcement for a quick promotion.',
        useCase: 'Best for free shipping, COD, or flash deals.',
        thumbnail: 'strip',
        settings: { visualLabel: 'Promo Strip', text: 'Free delivery on selected products today.' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'faq',
        label: 'FAQ',
        type: 'FAQ',
        title: 'Common questions',
        description: 'Answer buying questions before checkout.',
        useCase: 'Best for delivery, returns, sizing, and payment details.',
        thumbnail: 'list',
        settings: { visualLabel: 'FAQ', text: 'Q: How long does delivery take?\nA: Add your answer here.' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'newsletter',
        label: 'Newsletter',
        type: 'Newsletter',
        title: 'Join our updates',
        description: 'Invite shoppers to follow future launches.',
        useCase: 'Best for repeat purchase and audience building.',
        thumbnail: 'mail',
        settings: { visualLabel: 'Newsletter', text: 'Get product updates, offers, and launches.' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'brand-story',
        label: 'Brand Story',
        type: 'BrandStory',
        title: 'Our story',
        description: 'Create a short credibility-building brand block.',
        useCase: 'Best for premium, local, or handmade stores.',
        thumbnail: 'story',
        settings: { visualLabel: 'Brand Story', text: 'Share what makes your store different.' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'trust-badges',
        label: 'Trust Badges',
        type: 'TrustBadges',
        title: 'Why shop with us',
        description: 'Highlight secure payment, fast delivery, and support.',
        useCase: 'Best before All Products or checkout-focused content.',
        thumbnail: 'badges',
        settings: { visualLabel: 'Trust Badges', text: 'Secure checkout · Fast delivery · Easy support' },
        mobileSettings: { isVisible: true }
    },
    {
        templateId: 'collection-grid',
        label: 'Collection Grid',
        type: 'CategoryList',
        title: 'Explore collections',
        description: 'Use category cards as a future-ready collection grid.',
        useCase: 'Best for stores planning collection pages later.',
        thumbnail: 'collections',
        settings: { visualLabel: 'Collection Grid', maxCategories: 8, columns: 4 },
        mobileSettings: { columns: 2, isVisible: true }
    }
];

export const editorSectionOptions = Object.entries(SECTION_REGISTRY)
    .filter(([, definition]) => definition.editorEnabled !== false)
    .map(([value, definition]) => ({ value, label: definition.label }));

export const getSectionDisplayLabel = (section) => section?.settings?.visualLabel || section?.title || section?.type || 'Section';

export const settingsGroups = [
    { id: 'brand', label: 'Brand', icon: Palette, description: 'Logo and store identity' },
    { id: 'colors', label: 'Colors', icon: Palette, description: 'Brand colors and page surfaces' },
    { id: 'typography', label: 'Typography', icon: LayoutTemplate, description: 'Fonts and heading weight' },
    { id: 'layout', label: 'Layout', icon: LayoutTemplate, description: 'Width, spacing, and product grid' },
    { id: 'products', label: 'Product cards', icon: ShoppingBag, description: 'Product grid appearance' },
    { id: 'checkout', label: 'Checkout', icon: CreditCard, description: 'Checkout trust and branding' },
    { id: 'mobile', label: 'Mobile', icon: Smartphone, description: 'Small-screen controls' },
    { id: 'policies', label: 'Policies', icon: FileText, description: 'Refund, shipping, privacy, terms' }
];

export const structureTree = [
    {
        id: 'header',
        label: 'Navbar',
        group: 'navigation',
        children: [
            { id: 'logo', label: 'Logo', group: 'brand' },
            { id: 'navigation', label: 'Navigation', group: 'navigation' }
        ]
    },
    {
        id: 'homepage',
        label: 'Homepage',
        group: 'sections',
        children: [
            { id: 'hero', label: 'Hero / Banner', group: 'hero' },
            { id: 'sections', label: 'Dynamic sections', group: 'sections' },
            { id: 'allProducts', label: 'All products', group: 'products' }
        ]
    },
    {
        id: 'checkout',
        label: 'Checkout',
        group: 'checkout',
        children: [
            { id: 'checkoutBranding', label: 'Branding', group: 'checkout' },
            { id: 'policies', label: 'Policies', group: 'policies' }
        ]
    },
    {
        id: 'footer',
        label: 'Footer',
        group: 'footer',
        children: [
            { id: 'footerText', label: 'Brand story', group: 'footer' },
            { id: 'footerSocial', label: 'Contact and social links', group: 'footer' },
            { id: 'footerLinks', label: 'Support links', group: 'footer' }
        ]
    }
];

export const groupElementMap = {
    brand: 'logo',
    colors: 'themeColors',
    typography: 'typography',
    layout: 'layout',
    navigation: 'navigation',
    hero: 'hero',
    seo: 'homepageSeo',
    products: 'productCard',
    sections: 'sections',
    checkout: 'checkoutBranding',
    mobile: 'mobile',
    footer: 'footer',
    policies: 'policies'
};

export const storeLayoutItems = [
    {
        id: 'navbar',
        label: 'Navbar',
        description: 'Logo and top menu',
        target: 'header',
        group: 'navigation',
        icon: LinkIcon,
        locked: true,
        relatedTargets: ['header', 'navigation']
    },
    {
        id: 'hero',
        label: 'Hero / Banner',
        description: 'Homepage opening banner',
        target: 'hero',
        group: 'hero',
        icon: LayoutTemplate,
        locked: true,
        relatedTargets: ['hero']
    },
    {
        id: 'sections',
        label: 'Dynamic Sections',
        description: 'Add, reorder, duplicate, or remove sections',
        target: 'sections',
        group: 'sections',
        icon: LayoutTemplate,
        relatedTargets: ['sections']
    },
    {
        id: 'allProducts',
        label: 'All Products',
        description: 'Catalog grid and product card settings',
        target: 'allProducts',
        group: 'products',
        icon: ShoppingBag,
        locked: true,
        relatedTargets: ['allProducts', 'productCard']
    },
    {
        id: 'footer',
        label: 'Footer',
        description: 'Footer text, links, and social profiles',
        target: 'footer',
        group: 'footer',
        icon: FileText,
        locked: true,
        relatedTargets: ['footer', 'footerText', 'footerSocial', 'footerLinks']
    },
    {
        id: 'colors',
        label: 'Colors',
        description: 'Brand color, palettes, and advanced colors',
        target: 'themeColors',
        group: 'colors',
        icon: Palette,
        relatedTargets: ['themeColors']
    },
    {
        id: 'seo',
        label: 'Home Page SEO',
        description: 'Google and social preview',
        target: 'homepageSeo',
        group: 'seo',
        icon: Search,
        relatedTargets: ['homepageSeo']
    },
    {
        id: 'checkout',
        label: 'Checkout',
        description: 'Checkout branding and trust',
        target: 'checkout',
        group: 'checkout',
        icon: CreditCard,
        relatedTargets: ['checkout', 'checkoutBranding']
    },
    {
        id: 'mobile',
        label: 'Mobile',
        description: 'Small-screen controls',
        target: 'mobile',
        group: 'mobile',
        icon: Smartphone,
        relatedTargets: ['mobile']
    },
    {
        id: 'policies',
        label: 'Policies',
        description: 'Refund, shipping, privacy, and terms',
        target: 'policies',
        group: 'policies',
        icon: FileText,
        relatedTargets: ['policies']
    }
];

export const builderSectionItems = storeLayoutItems.filter(item => (
    ['navbar', 'hero', 'sections', 'allProducts', 'footer'].includes(item.id)
));

export const themeSettingItems = settingsGroups.map(item => ({
    id: item.id,
    label: item.label,
    description: item.description,
    target: groupElementMap[item.id] || item.id,
    group: item.id,
    icon: item.icon,
    relatedTargets: [groupElementMap[item.id] || item.id]
}));

export const seoStatusItem = storeLayoutItems.find(item => item.id === 'seo');

export const fixedPreviewElements = new Set(['header', 'hero', 'allProducts', 'footer']);
export const isHomepageSectionLocked = (section) => Boolean(section?.settings?.isLocked);

export const structureComponentRegistry = structureTree.reduce((registry, item) => {
    registry[item.id] = { label: item.label, group: item.group };
    (item.children || []).forEach(child => {
        registry[child.id] = { label: child.label, group: child.group };
    });
    return registry;
}, {});

export const editorComponentRegistry = {
    ...structureComponentRegistry,
    themeColors: { label: 'Colors', group: 'colors' },
    typography: { label: 'Typography', group: 'typography' },
    layout: { label: 'Layout', group: 'layout' },
    mobile: { label: 'Mobile', group: 'mobile' },
    homepageSeo: { label: 'Homepage SEO', group: 'seo' },
    heroTitle: { label: 'Hero title', group: 'hero' },
    heroSubtitle: { label: 'Hero subtitle', group: 'hero' },
    heroButton: { label: 'Hero / Banner', group: 'hero' }
};

export const getSectionSelectionId = (section, fallbackIndex = null) => {
    const id = section?.id || section?._id;
    return id ? `section:${id}` : `section-${fallbackIndex ?? 0}`;
};

export const getSectionIndexFromSelection = (target, theme = {}) => {
    if (!target) return -1;
    if (target.startsWith('section:')) {
        const id = target.slice('section:'.length);
        return (theme.homepageSections || []).findIndex(section => String(section?.id || section?._id) === id);
    }
    if (target.startsWith('section-')) {
        const index = Number(target.replace('section-', ''));
        return Number.isFinite(index) ? index : -1;
    }
    return -1;
};

export const resolveEditorComponent = (target, theme = {}) => {
    if (!target) return null;

    if (target.startsWith('section-') || target.startsWith('section:')) {
        const sectionIndex = getSectionIndexFromSelection(target, theme);
        const section = theme.homepageSections?.[sectionIndex];
        return {
            id: target,
            group: 'sections',
            label: section ? getSectionDisplayLabel(section) : 'Homepage section'
        };
    }

    if (target.startsWith('navigation-')) {
        const navigationIndex = Number(target.replace('navigation-', ''));
        const navigationItem = theme.navigation?.[navigationIndex];
        return {
            id: target,
            group: 'navigation',
            label: navigationItem?.label ? `Navigation: ${navigationItem.label}` : 'Navigation label'
        };
    }

    return editorComponentRegistry[target] || null;
};

export const colorGroups = [
    {
        title: 'Core',
        fields: [
            { key: 'accent', label: 'Accent', help: 'Links, badges, active filters, and focus states.' },
            { key: 'accentBg', label: 'Accent background', help: 'Soft highlighted panels and category chips.' },
            { key: 'background', label: 'Page background', help: 'Main storefront background color.' },
            { key: 'foreground', label: 'Text color', help: 'Default storefront text color.' }
        ]
    },
    {
        title: 'Buttons',
        fields: [
            { key: 'primaryButtonBg', label: 'Primary button background', help: 'Buy, checkout, and main call-to-action buttons.' },
            { key: 'primaryButtonText', label: 'Primary button text', help: 'Text color used on primary buttons.' },
            { key: 'primaryButtonHoverBg', label: 'Primary button hover', help: 'Desktop hover color for primary buttons.' },
            { key: 'secondaryButtonBg', label: 'Secondary button background', help: 'Cart icon and secondary action buttons.' },
            { key: 'secondaryButtonText', label: 'Secondary button text', help: 'Text and icon color used on secondary buttons.' },
            { key: 'secondaryButtonHoverBg', label: 'Secondary button hover', help: 'Desktop hover color for secondary buttons.' }
        ]
    },
    {
        title: 'Navigation',
        fields: [
            { key: 'navbarBackground', label: 'Navbar background', help: 'Header background across desktop and mobile.' },
            { key: 'navbarText', label: 'Navbar text', help: 'Logo and navigation text color.' },
            { key: 'navbarHover', label: 'Navbar hover', help: 'Desktop hover color for header links and icons.' }
        ]
    },
    {
        title: 'Product cards',
        fields: [
            { key: 'cardBackground', label: 'Card background', help: 'Product card surface color.' },
            { key: 'cardBorder', label: 'Card border', help: 'Default product card border color.' },
            { key: 'cardHoverBorder', label: 'Card hover border', help: 'Desktop hover border color for product cards.' },
            { key: 'priceColor', label: 'Price color', help: 'Default product price color.' },
            { key: 'saleBadgeBg', label: 'Sale badge background', help: 'Discount badge background color.' },
            { key: 'saleBadgeText', label: 'Sale badge text', help: 'Discount badge text color.' },
            { key: 'ratingColor', label: 'Rating color', help: 'Star and rating color.' }
        ]
    },
    {
        title: 'Footer',
        fields: [
            { key: 'footerBackground', label: 'Footer background', help: 'Main footer background.' },
            { key: 'footerText', label: 'Footer text', help: 'Footer paragraph and copyright text.' },
            { key: 'footerLink', label: 'Footer links', help: 'Footer link and trust icon color.' }
        ]
    }
];

export const colorFields = colorGroups.flatMap(group => group.fields);
