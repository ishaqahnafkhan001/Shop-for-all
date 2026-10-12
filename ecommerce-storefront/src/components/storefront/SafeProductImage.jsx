"use client";
import SharedSafeProductImage from '@scaleup/storefront-renderer/presentation/SafeProductImage';
import StorefrontPresentationRuntime from './StorefrontPresentationRuntime';
export default function SafeProductImage(props) {
    return <StorefrontPresentationRuntime><SharedSafeProductImage {...props} /></StorefrontPresentationRuntime>;
}
