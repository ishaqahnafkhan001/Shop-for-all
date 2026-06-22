"use client";
import React, { memo, useMemo } from 'react';

const variantMatches = (variant, candidate) => {
    if (!variant?.attributes?.length || variant.isActive === false || variant.status === 'archived') return false;
    return Object.entries(candidate).every(([name, value]) => {
        if (!value) return true;
        return variant.attributes.some(attr => attr.name === name && attr.value === value);
    });
};

const VariantSelector = memo(function VariantSelector({ availableAttributes, selectedAttributes, variants = [], onSelect }) {
    const optionAvailability = useMemo(() => {
        const availability = {};
        for (const [attrName, values] of Object.entries(availableAttributes)) {
            availability[attrName] = {};
            values.forEach(value => {
                const candidate = { ...selectedAttributes, [attrName]: value };
                availability[attrName][value] = variants.some(variant => variantMatches(variant, candidate));
            });
        }
        return availability;
    }, [availableAttributes, selectedAttributes, variants]);

    if (!Object.keys(availableAttributes).length) return null;

    return (
        <div className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="flex flex-col gap-2 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-black text-slate-950">Choose your options</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Select a combination to update price, SKU, image, and stock.</p>
                </div>
                {Object.keys(selectedAttributes).length > 0 && (
                    <p className="max-w-full truncate rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
                        {Object.entries(selectedAttributes).filter(([, value]) => value).map(([name, value]) => `${name}: ${value}`).join(' / ')}
                    </p>
                )}
            </div>
            {Object.entries(availableAttributes).map(([attrName, values]) => (
                <div key={attrName}>
                    <h3 className="mb-3 flex min-w-0 items-center text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        {attrName}
                        <span className="ml-3 h-px flex-1 bg-slate-200" />
                    </h3>
                    <div className="flex min-w-0 flex-wrap gap-2.5">
                        {values.map(value => {
                            const isSelected = selectedAttributes[attrName] === value;
                            const isAvailable = optionAvailability[attrName]?.[value] !== false;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => onSelect(attrName, value)}
                                    disabled={!isAvailable}
                                    aria-pressed={isSelected}
                                    title={isAvailable ? `${attrName}: ${value}` : `${value} is unavailable with current options`}
                                    className={`min-h-11 max-w-full rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-200
                                        ${isSelected
                                        ? 'bg-[var(--sf-accent)] text-white shadow-lg shadow-teal-900/15'
                                        : 'border border-slate-200 bg-white text-slate-700 hover:border-[var(--sf-accent)] hover:bg-slate-50'
                                    } disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through`}
                                >
                                    <span className="block max-w-[12rem] truncate">{value}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
});

export default VariantSelector;
