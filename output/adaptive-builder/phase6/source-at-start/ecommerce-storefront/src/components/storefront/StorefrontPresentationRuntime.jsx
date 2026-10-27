"use client";
import Image from 'next/image';
import Link from 'next/link';
import { PresentationRuntime } from '@scaleup/storefront-renderer/presentation/Runtime';
const adapters = { Image, Link };
export default function StorefrontPresentationRuntime({ children }) {
    return <PresentationRuntime value={adapters}>{children}</PresentationRuntime>;
}
