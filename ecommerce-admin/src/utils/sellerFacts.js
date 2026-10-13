export const blankSellerFacts = () => ({
    brand: '',
    model: '',
    material: '',
    dimensions: '',
    packageContents: ''
});

export const normalizeSellerFacts = (value = {}) => Object.fromEntries(
    Object.keys(blankSellerFacts()).map(key => [key, typeof value?.[key] === 'string' ? value[key] : ''])
);
