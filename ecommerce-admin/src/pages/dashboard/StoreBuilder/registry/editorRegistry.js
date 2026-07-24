export const editorRegistry = Object.freeze({
    brand: { id: 'brand', selection: 'logo', label: 'Brand' },
    navigation: { id: 'navigation', selection: 'navigation', label: 'Navbar' },
    hero: { id: 'hero', selection: 'hero', label: 'Hero / Banner' },
    colors: { id: 'colors', selection: 'themeColors', label: 'Colors' },
    typography: { id: 'typography', selection: 'typography', label: 'Typography' },
    layout: { id: 'layout', selection: 'layout', label: 'Layout and spacing' },
    products: { id: 'products', selection: 'productCard', label: 'Product cards' },
    sections: { id: 'sections', selection: 'sections', label: 'Dynamic section' },
    checkout: { id: 'checkout', selection: 'checkoutBranding', label: 'Checkout appearance' },
    mobile: { id: 'mobile', selection: 'mobile', label: 'Mobile appearance' },
    footer: { id: 'footer', selection: 'footer', label: 'Footer' },
    policies: { id: 'policies', selection: 'policies', label: 'Policies' }
});

export const resolveEditorRegistryEntry = (group) => editorRegistry[group] || editorRegistry.brand;
