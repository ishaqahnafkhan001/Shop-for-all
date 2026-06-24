"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { shouldUseUnoptimizedImage } from "@/lib/imageDomains";
import { getImageUrlFromValue } from "@/lib/seo";

export default function SafeProductImage({
    src,
    alt = "Product image",
    fill = false,
    width,
    height,
    sizes,
    priority = false,
    className = "",
    fallbackClassName = "",
    iconClassName = "",
    unoptimized,
    ...props
}) {
    const [failedSrc, setFailedSrc] = useState("");
    const safeSrc = String(getImageUrlFromValue(src) || "").trim();
    const failed = Boolean(safeSrc && failedSrc === safeSrc);

    if (!safeSrc || failed) {
        return (
            <div
                className={fallbackClassName || "flex h-full w-full items-center justify-center bg-slate-100 text-slate-300"}
                aria-label={alt}
                role="img"
            >
                <ShoppingBag size={24} className={iconClassName} />
            </div>
        );
    }

    if (fill) {
        return (
            <Image
                {...props}
                src={safeSrc}
                alt={alt}
                fill
                sizes={sizes}
                priority={priority}
                className={className}
                onError={() => setFailedSrc(safeSrc)}
                unoptimized={unoptimized ?? shouldUseUnoptimizedImage(safeSrc)}
            />
        );
    }

    return (
        <Image
            {...props}
            src={safeSrc}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            priority={priority}
            className={className}
            onError={() => setFailedSrc(safeSrc)}
            unoptimized={unoptimized ?? shouldUseUnoptimizedImage(safeSrc)}
        />
    );
}
