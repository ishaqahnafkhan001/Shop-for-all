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
        <div className="mb-7 space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6">
            {Object.entries(availableAttributes).map(([attrName, values]) => (
                <div key={attrName}>
                    <h3 className="mb-3 flex items-center text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        {attrName}
                        <span className="ml-3 h-px flex-1 bg-slate-200" />
                    </h3>
                    <div className="flex flex-wrap gap-3.5">
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
                                    className={`rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-200
                                        ${isSelected
                                        ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/15'
                                        : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-950 hover:bg-slate-50'
                                    } disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through`}
                                >
                                    {value}
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
