export const SEO_TITLE_MIN = 50;
export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MIN = 120;
export const SEO_DESCRIPTION_MAX = 160;

export const cleanSeoText = (value = '') => String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const truncateSeoText = (value = '', max = 160) => {
    const clean = cleanSeoText(value);
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1).trim()}…`;
};

export const slugifyForSeo = (value = '') => cleanSeoText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const getLengthStatus = (value = '', min = 0, max = 999) => {
    const length = cleanSeoText(value).length;
    if (length === 0) return { length, tone: 'empty', message: 'Empty' };
    if (length < min) return { length, tone: 'short', message: 'A little short' };
    if (length > max) return { length, tone: 'long', message: 'Too long' };
    return { length, tone: 'good', message: 'Good length' };
};

export const buildProductSeoPreview = ({ product = {}, shopName = 'Your Store' } = {}) => {
    const slug = slugifyForSeo(product.slug || product.title || 'product');
    const title = truncateSeoText(product.seo?.title || `${product.title || 'Product title'} | ${shopName}`, SEO_TITLE_MAX);
    const description = truncateSeoText(
        product.seo?.description ||
        product.shortDescription ||
        product.description ||
        `Buy ${product.title || 'this product'} from ${shopName}.`,
        SEO_DESCRIPTION_MAX
    );

    return {
        title,
        description,
        url: `https://your-store.com/products/${slug || 'product-slug'}`
    };
};

export const buildStoreSeoPreview = ({ theme = {}, shopName = 'Your Store', subdomain = 'your-store', domain = '' } = {}) => {
    const seo = theme.seo || {};
    const hero = theme.hero || {};
    const title = truncateSeoText(seo.title || hero.title || `${shopName || 'Your Store'} - Online Store`, SEO_TITLE_MAX);
    const description = truncateSeoText(
        seo.description ||
        hero.subtitle ||
        `Shop products from ${shopName || 'this store'}.`,
        SEO_DESCRIPTION_MAX
    );
    const url = domain
        ? `https://${String(domain).replace(/^https?:\/\//, '').replace(/\/$/, '')}`
        : `https://${subdomain || 'your-store'}.scaleup.codes`;

    return { title, description, url };
};

const scoreFromTasks = (tasks = []) => {
    const totalWeight = tasks.reduce((sum, item) => sum + item.weight, 0) || 1;
    const completeWeight = tasks.filter(item => item.done).reduce((sum, item) => sum + item.weight, 0);
    return Math.round((completeWeight / totalWeight) * 100);
};

export const scoreProductSeo = ({ product = {}, hasImage = false } = {}) => {
    const sellingPrice = Number(product.pricing?.sellingPrice || product.price || product.sellingPrice || 0);
    const stockKnown = Number.isFinite(Number(product.stock)) ||
        Number.isFinite(Number(product.simpleStock)) ||
        Number.isFinite(Number(product.defaultStock)) ||
        Array.isArray(product.variants);
    const slug = slugifyForSeo(product.slug || product.title);
    const seoTitle = cleanSeoText(product.seo?.title || product.title);
    const seoDescription = cleanSeoText(product.seo?.description || product.shortDescription || product.description);
    const images = Array.isArray(product.images) ? product.images : [];
    const imagePresent = hasImage || Boolean(product.imageUrl || product.thumbnail || images.length > 0);
    const imageAltText = cleanSeoText(product.imageAltText || images.find(image => typeof image === 'object' && image?.alt)?.alt);
    const hasCategoryOrCollection = Boolean(cleanSeoText(product.category)) || (Array.isArray(product.collections) && product.collections.length > 0);
    const tasks = [
        { label: 'Product title added', done: Boolean(cleanSeoText(product.title)), weight: 12, action: 'Add a clear product title.' },
        { label: 'Description written', done: cleanSeoText(product.description).length >= 20, weight: 12, action: 'Write a helpful product description.' },
        { label: 'Product image added', done: imagePresent, weight: 12, action: 'Upload at least one clear product image.' },
        { label: 'Image alt text added', done: Boolean(imageAltText), weight: 8, action: 'Add image alt text so search engines understand the product image.' },
        { label: 'Clean URL slug', done: Boolean(slug), weight: 10, action: 'Add a short product URL slug.' },
        { label: 'SEO title ready', done: Boolean(seoTitle), weight: 10, action: 'Add an SEO title or use the product title fallback.' },
        { label: 'SEO description ready', done: Boolean(seoDescription), weight: 10, action: 'Add an SEO description or use the product description fallback.' },
        { label: 'Category or collection assigned', done: hasCategoryOrCollection, weight: 10, action: 'Choose a category or collection.' },
        { label: 'Price exists', done: sellingPrice > 0, weight: 12, action: 'Set a selling price.' },
        { label: 'Stock status known', done: stockKnown, weight: 12, action: 'Set stock or variants.' }
    ];

    return {
        score: scoreFromTasks(tasks),
        tasks,
        missing: tasks.filter(item => !item.done)
    };
};

export const scoreStoreSeo = ({ theme = {}, shopName = '', productCount = 0, customDomain = {}, collectionCount = 0, imageAltCoverage = 0 } = {}) => {
    const seo = theme.seo || {};
    const policies = theme.policies || {};
    const footer = theme.footer || {};
    const policyCount = ['privacy', 'terms', 'refund', 'shipping'].filter(key => cleanSeoText(policies[key]).length > 0).length;
    const hasContact = Boolean(cleanSeoText(footer.email || footer.phone || footer.contactEmail || footer.contactPhone || footer.text));
    const hasSocial = Boolean(cleanSeoText(seo.facebookUrl || footer.facebookUrl || footer.instagramUrl));
    const customDomainConnected = customDomain?.status === 'Verified' && Boolean(customDomain?.domain);
    const homepageTitle = cleanSeoText(seo.title || theme.hero?.title || shopName);
    const homepageDescription = cleanSeoText(seo.description || theme.hero?.subtitle);
    const googleVerification = cleanSeoText(seo.googleSiteVerification);

    const tasks = [
        { label: 'Store name added', done: Boolean(cleanSeoText(shopName)), weight: 10, action: 'Complete your store profile.' },
        { label: 'Logo uploaded', done: Boolean(theme.logoUrl), weight: 10, action: 'Upload a store logo.' },
        { label: 'Homepage SEO title ready', done: Boolean(homepageTitle), weight: 12, action: 'Add a homepage SEO title.' },
        { label: 'Homepage SEO description ready', done: Boolean(homepageDescription), weight: 12, action: 'Add a homepage SEO description.' },
        { label: 'Policies added', done: policyCount >= 2, weight: 12, action: 'Add privacy, refund, shipping, or terms policies.' },
        { label: 'Contact information visible', done: hasContact, weight: 10, action: 'Add contact details in the footer.' },
        { label: 'Facebook/social link added', done: hasSocial, weight: 8, action: 'Add a Facebook page or social link.' },
        { label: 'At least 5 published products', done: productCount >= 5, weight: 16, action: 'Publish at least 5 products.' },
        { label: 'Collection pages ready', done: collectionCount > 0, weight: 8, action: 'Create at least one collection with products.' },
        { label: 'Product image alt text coverage', done: Number(imageAltCoverage) >= 60, weight: 8, action: 'Add image alt text to most product images.' },
        { label: 'Google verification added', done: Boolean(googleVerification), weight: 6, action: 'Add your Google Search Console verification code.' },
        { label: 'Custom domain connected', done: customDomainConnected, weight: 10, action: 'Connect a verified custom domain when your plan supports it.' }
    ];

    return {
        score: scoreFromTasks(tasks),
        tasks,
        missing: tasks.filter(item => !item.done)
    };
};
