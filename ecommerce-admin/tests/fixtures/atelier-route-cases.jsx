/* eslint-disable react-refresh/only-export-components -- Test-only route cases also expose their synthetic fixture data. */
import React from 'react';
import { CartProvider, useCart } from '@/context/CartContext';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';
import CategoryPage from '@/app/[subdomain]/categories/[slug]/CategoryPageClient';
import CollectionPage from '@/app/[subdomain]/collections/[slug]/CollectionPageClient';
import LiveProduct from '@/components/product/ProductDetails';
import { ProductDetailsView } from '@scaleup/storefront-renderer/presentation/ProductDetailsView';
import RelatedProducts from '@scaleup/storefront-renderer/presentation/RelatedProducts';
import ReviewSection from '@scaleup/storefront-renderer/presentation/ReviewSection';
import { getProductPresentation, getInitialAttributes } from '@scaleup/storefront-renderer/product-data';
import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { FixtureEnvironment } from './atelier-route-runtime.jsx';
import { ReferenceStorefrontHeader, ReferenceStorefrontFooter } from '@scaleup/storefront-renderer';
import SearchModal from '@/components/search/SearchModal';
import { FixtureLink } from './atelier-route-runtime.jsx';
import { fixtureProducts, fixtureReviews } from './atelier-route-data.js';
const noop = () => {};
export function FixtureChrome({
  theme,
  children
}) {
  const {
    cartCount
  } = useCart();
  const [search, setSearch] = React.useState(false);
  return <><ReferenceStorefrontHeader theme={theme} shopName="Fixture merchant" cartCount={cartCount} onSearch={() => setSearch(true)} LinkComponent={FixtureLink} />{children}<ReferenceStorefrontFooter theme={theme} shopName="Fixture merchant" cartCount={cartCount} LinkComponent={FixtureLink} /><SearchModal isOpen={search} onClose={() => setSearch(false)} products={fixtureProducts} /></>;
}
export function FixtureCartStatus() {
  const cart = useCart();
  return <div className="fixture-cart-tools"><button type="button" onClick={() => cart.addToCart({
      ...fixtureProducts[0],
      variantId: fixtureProducts[0].variants[0]._id,
      selectedVariant: fixtureProducts[0].variants[0],
      cartPrice: 1080
    }, 1)}>Seed test bag</button><button type="button" onClick={cart.clearCart}>Clear test bag</button><output aria-label="Test bag state">{JSON.stringify(cart.cartItems.map(p => ({
        id: p._id,
        variantId: p.variantId,
        quantity: p.quantity,
        price: p.cartPrice ?? p.finalPrice
      })))}</output></div>;
}
export function Phase3Case({
  page,
  theme,
  scenario = 'normal',
  live = false,
  environment = {},
  showDiagnostics = false
}) {
  const presentationVariant = getStorefrontPresentationVariant(theme);
  const products = fixtureProducts.map(p => ({
    ...p
  }));
  let product = products[0];
  if (scenario === 'long') product = {
    ...product,
    title: 'দৈনন্দিন ব্যবহারের জন্য বিক্রেতার নিশ্চিত তথ্যসহ সুন্দর হস্তনির্মিত পণ্যের দীর্ঘ নাম — merchant-authored product with a deliberately long title',
    description: 'বিক্রেতার লেখা সঠিক পণ্যের বিবরণ। '.repeat(30)
  };
  if (scenario === 'broken') product = {
    ...product,
    images: ['/tests/fixtures/missing-product.svg'],
    variants: product.variants.map(v => ({
      ...v,
      image: '/tests/fixtures/missing-product.svg'
    }))
  };
  if (scenario === 'no-images') product = {
    ...product,
    images: [],
    variants: []
  };
  if (scenario === 'one-image') product = {
    ...product,
    images: product.images.slice(0, 1),
    variants: []
  };
  if (scenario === 'soldout') product = {
    ...product,
    stock: 0,
    totalStock: 0,
    variants: product.variants.map(v => ({
      ...v,
      stock: 0
    }))
  };
  const attrs = scenario === 'zero' ? {
    Finish: 'Studio edition'
  } : getInitialAttributes(product);
  const model = getProductPresentation(product, attrs);
  const config = {
    ...theme.productCard,
    colors: theme.colors?.productCard
  };
  const value = {
    theme,
    tenant: 'atelier-test-a',
    scenario,
    path: page === 'collection' ? '/collections/merchant-edit' : page === 'category' ? '/categories/objects' : '/products/merchant-object',
    ...environment
  };
  let content;
  if (page === 'product') content = live ? <LiveProduct subdomain={value.tenant} id={product._id} initialProduct={scenario === 'missing' || scenario === 'loading' ? null : product} /> : <ProductDetailsView product={product} presentationVariant={presentationVariant} {...model} selectedAttributes={attrs} quantity={1} setQuantity={noop} handleVariantSelect={noop} handleAddToCart={noop} handleBuyNow={noop} relatedContent={<RelatedProducts products={products.slice(1)} presentationVariant={presentationVariant} productCard={config} />} reviewContent={<ReviewSection presentationVariant={presentationVariant} subdomain={value.tenant} id={product._id} reviews={fixtureReviews} isLoggedIn={false} />} />;else if (page === 'category') content = <CategoryPage shop={{
    subdomain: value.tenant
  }} category="Objects" categoryDetail={{
    coverImage: {
      url: '/tests/fixtures/theme-media.svg',
      altText: 'Merchant category cover'
    }
  }} products={scenario === 'empty' ? [] : products} filters={environment.filters || {}} pagination={{
    totalItems: 24,
    page: 2,
    totalPages: 6
  }} />;else content = <CollectionPage shop={{
    subdomain: value.tenant
  }} collection={{
    title: 'The merchant edit',
    description: 'Real merchant collection content is supplied by the existing route.',
    image: '/tests/fixtures/theme-media.svg'
  }} products={scenario === 'empty' ? [] : products} filters={environment.filters || {}} pagination={{
    totalItems: 24,
    page: 2,
    totalPages: 6
  }} />;
  return <FixtureEnvironment value={value}><CartProvider key={value.tenant} subdomain={value.tenant}><StorefrontPresentationRuntime>{showDiagnostics && <FixtureCartStatus />}{live ? <FixtureChrome theme={theme}>{content}</FixtureChrome> : content}</StorefrontPresentationRuntime></CartProvider></FixtureEnvironment>;
}
export { fixtureProducts, fixtureReviews };
