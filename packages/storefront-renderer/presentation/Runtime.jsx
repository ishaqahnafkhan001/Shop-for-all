"use client";
import { createContext, useContext } from 'react';
import { DefaultLink } from '../reference/referenceCore.jsx';

export const NativeImage = ({ fill, priority, unoptimized, quality, sizes, style, ...props }) => {
    void unoptimized; void quality;
    return <img {...props} sizes={sizes} loading={priority ? 'eager' : 'lazy'} decoding="async"
        style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : {}), ...style }} />;
};
const Context = createContext({ Link: DefaultLink, Image: NativeImage });
export const PresentationRuntime = Context.Provider;
export function Link(props) { const runtime = useContext(Context); return <runtime.Link {...props} />; }
export function Image(props) { const runtime = useContext(Context); return <runtime.Image {...props} />; }
