export const settingsRegistry = Object.freeze([
    { id: 'logoUrl', label: 'Store logo', keywords: ['brand', 'logo'], area: 'Brand', group: 'brand', selection: 'logo', fieldPath: 'logoUrl' },
    { id: 'hero.title', label: 'Hero title', keywords: ['hero', 'banner', 'heading'], area: 'Sections', group: 'hero', selection: 'hero', fieldPath: 'hero.title' },
    { id: 'colors.accent', label: 'Main brand color', keywords: ['brand', 'color', 'accent'], area: 'Theme settings', group: 'colors', selection: 'themeColors', fieldPath: 'colors.accent' },
    { id: 'typography.bodyFont', label: 'Body font', keywords: ['font', 'type'], area: 'Theme settings', group: 'typography', selection: 'typography', fieldPath: 'typography.bodyFont' },
    { id: 'footer.background', label: 'Footer background color', keywords: ['footer', 'color', 'background'], area: 'Theme settings', group: 'footer', selection: 'footer', fieldPath: 'colors.footer.background' },
    { id: 'checkout.buttonBackground', label: 'Checkout button color', keywords: ['checkout', 'button', 'color'], area: 'Theme settings', group: 'checkout', selection: 'checkoutBranding', fieldPath: 'colors.checkout.buttonBackground' },
    { id: 'customDomain.domain', label: 'Custom domain', keywords: ['domain', 'url'], area: 'Theme settings', group: 'domain', selection: 'domain', fieldPath: 'customDomain.domain' }
]);

export const findSettingByPath = (path = '') => settingsRegistry.find(setting => (
    path === setting.fieldPath || path.startsWith(`${setting.fieldPath}.`)
));
