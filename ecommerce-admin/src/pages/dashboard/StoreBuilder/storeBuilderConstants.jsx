import {
    CreditCard,
    FileText,
    Globe,
    LayoutTemplate,
    Link as LinkIcon,
    Palette,
    ShoppingBag,
    Smartphone
} from 'lucide-react';

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
        type: 'TextBlock',
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
        type: 'TextBlock',
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
        type: 'TextBlock',
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
        type: 'TextBlock',
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
        type: 'TextBlock',
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

export const getSectionDisplayLabel = (section) => section?.settings?.visualLabel || section?.title || section?.type || 'Section';

export const settingsGroups = [
    { id: 'brand', label: 'Brand', icon: Palette, description: 'Logo and store identity' },
    { id: 'colors', label: 'Colors', icon: Palette, description: 'Brand colors and page surfaces' },
    { id: 'typography', label: 'Typography', icon: LayoutTemplate, description: 'Fonts and heading weight' },
    { id: 'layout', label: 'Layout', icon: LayoutTemplate, description: 'Width, spacing, and product grid' },
    { id: 'navigation', label: 'Header and navigation', icon: LinkIcon, description: 'Top menu links' },
    { id: 'hero', label: 'Hero', icon: LayoutTemplate, description: 'Homepage opening banner' },
    { id: 'products', label: 'Product cards', icon: ShoppingBag, description: 'Product grid appearance' },
    { id: 'sections', label: 'Homepage sections', icon: LayoutTemplate, description: 'Order and visibility' },
    { id: 'checkout', label: 'Checkout', icon: CreditCard, description: 'Checkout trust and branding' },
    { id: 'mobile', label: 'Mobile', icon: Smartphone, description: 'Small-screen controls' },
    { id: 'footer', label: 'Footer', icon: FileText, description: 'Footer text and links' },
    { id: 'policies', label: 'Policies', icon: FileText, description: 'Refund, shipping, privacy, terms' },
    { id: 'domain', label: 'Domain', icon: Globe, description: 'Custom domain status' }
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
            { id: 'hero', label: 'Hero', group: 'hero' },
            { id: 'heroButton', label: 'Hero button', group: 'hero' },
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
            { id: 'footerText', label: 'Footer text', group: 'footer' },
            { id: 'footerLinks', label: 'Footer links', group: 'footer' }
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
    products: 'productCard',
    sections: 'sections',
    checkout: 'checkoutBranding',
    mobile: 'mobile',
    footer: 'footer',
    policies: 'policies',
    domain: 'domain'
};

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
    domain: { label: 'Domain', group: 'domain' },
    heroTitle: { label: 'Hero title', group: 'hero' },
    heroSubtitle: { label: 'Hero subtitle', group: 'hero' },
    heroButton: { label: 'Hero button', group: 'hero' }
};

export const resolveEditorComponent = (target, theme = {}) => {
    if (!target) return null;

    if (target.startsWith('section-')) {
        const sectionIndex = Number(target.replace('section-', ''));
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
