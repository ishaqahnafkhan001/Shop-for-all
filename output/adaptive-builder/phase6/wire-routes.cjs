// One-time, exact JSX edits; fails if a known presentation seam is absent.
const fs = require('node:fs');
const root = 'ecommerce-storefront/src/';
const edits = [
 ['components/storefront/Navbar.jsx','header','ReferenceStorefrontHeader'],
 ['components/storefront/StorefrontFooter.jsx','footer','ReferenceStorefrontFooter'],
 ['components/product/ProductDetails.jsx','product','ProductDetailsView'],
 ['app/[subdomain]/categories/[slug]/CategoryPageClient.jsx','category','CategoryView'],
 ['app/[subdomain]/collections/[slug]/CollectionPageClient.jsx','collection','CollectionView'],
 ['app/[subdomain]/cart/page.jsx','cart','CartView'],
 ['app/[subdomain]/track/page.jsx','track','TrackingView'],
 ['app/[subdomain]/policies/page.jsx','policiesIndex','PolicyIndexView'],
 ['app/[subdomain]/policies/[type]/PolicyPageClient.jsx','policy','PolicyView'],
 ['app/[subdomain]/account/page.jsx','account','PasswordResetFlow'],
 ['app/[subdomain]/account/page.jsx','account','AuthView'],
 ['app/[subdomain]/account/page.jsx','account','VendorView'],
 ['app/[subdomain]/account/page.jsx','account','CustomerDashboard'],
 ['app/[subdomain]/StorefrontHomeClient.jsx','home','ReferenceStorefrontHome'],
];
for (const [file, kind, component] of edits) {
 const path = root + file; let source = fs.readFileSync(path, 'utf8');
 if (!source.includes("import AdaptivePresentation from '@/components/storefront/AdaptivePresentation';")) {
  const point = source.indexOf('import '); source = source.slice(0, point) + "import AdaptivePresentation from '@/components/storefront/AdaptivePresentation';\n" + source.slice(point);
 }
 const start = source.indexOf(`<${component}`);
 if (start < 0) throw Error(file + ': missing component');
 // Find the end of this self-closing JSX element, respecting nested JSX in props.
 let i = start, braces = 0, quote = null;
 for (; i < source.length; i++) {
  const c = source[i];
  if (quote) { if(c === '\\') i++; else if(c === quote) quote = null; continue; }
  if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
  if(c === '{') braces++; else if(c === '}') braces--;
  if (!braces && source.slice(i, i + 2) === '/>') break;
 }
 if(i >= source.length) throw Error('No closing element: ' + file);
 const extra = kind === 'home' ? ' catalogActions={{ addToCart: handleProductAdd, buyNow: product => productActions.buyNow(product, { location: "adaptive-home" }) }}' : ' core';
 source = source.slice(0, start) + `<AdaptivePresentation pageKind="${kind}"${extra}>` + source.slice(start, i + 2) + '</AdaptivePresentation>' + source.slice(i + 2);
 fs.writeFileSync(path, source);
}
