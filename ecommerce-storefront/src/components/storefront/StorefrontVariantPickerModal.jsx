"use client";

import SafeProductImage from "@/components/storefront/SafeProductImage";
import { getImageUrlFromValue, getProductImageAlt } from "@/lib/seo";
import { Loader2, X } from "lucide-react";

const formatVariantLabel = (variant = {}) => {
    const attributes = Array.isArray(variant.attributes) ? variant.attributes : [];
    if (attributes.length === 0) return variant.sku || "Default option";
    return attributes
        .map((attribute) => `${attribute.name}: ${attribute.value}`)
        .join(" / ");
};

export default function StorefrontVariantPickerModal({
    open,
    product,
    loading = false,
    onClose,
    onSelectVariant,
}) {
    if (!open) return null;

    const variants = (product?.variants || []).filter((variant) => variant?.isActive !== false && variant?.status !== "archived");
    const image = product?.images?.[0] || product?.imageUrl || "";

    return (
        <div className="fixed inset-0 z-[120] flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="variant-picker-title">
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:max-w-lg sm:rounded-[2rem]">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
                    <div>
                        <p className="sf-kicker">Choose option</p>
                        <h2 id="variant-picker-title" className="mt-1 text-xl font-black text-slate-950">
                            {product?.title || "Select a variant"}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Pick the option you want before going to checkout.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
                        aria-label="Close variant selector"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                    <div className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                        <SafeProductImage
                            src={getImageUrlFromValue(image)}
                            alt={getProductImageAlt({ product, image })}
                            width={88}
                            height={88}
                            className="h-20 w-20 rounded-2xl border border-white object-cover shadow-sm"
                            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-slate-300"
                            iconClassName="h-7 w-7"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-black text-slate-950">{product?.title}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                {variants.length} option{variants.length === 1 ? "" : "s"} available
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-200 py-10 text-slate-500">
                            <Loader2 size={20} className="mr-2 animate-spin" />
                            Loading options
                        </div>
                    ) : variants.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 px-5 py-8 text-center">
                            <p className="font-black text-slate-950">No available options</p>
                            <p className="mt-1 text-sm text-slate-500">This product is currently unavailable.</p>
                        </div>
                    ) : (
                        <div className="grid max-h-[48vh] gap-3 overflow-y-auto pr-1 sm:max-h-[52vh]">
                            {variants.map((variant) => {
                                const stock = Number(variant.stock ?? variant.inventory?.stock ?? 0);
                                return (
                                    <button
                                        key={variant._id}
                                        type="button"
                                        onClick={() => onSelectVariant(variant)}
                                        disabled={stock <= 0}
                                        className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-black text-slate-950">
                                                {formatVariantLabel(variant)}
                                            </span>
                                            {variant.sku && (
                                                <span className="mt-1 block text-xs font-semibold text-slate-400">
                                                    SKU: {variant.sku}
                                                </span>
                                            )}
                                        </span>
                                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                                            {stock > 0 ? `${stock} in stock` : "Out"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
