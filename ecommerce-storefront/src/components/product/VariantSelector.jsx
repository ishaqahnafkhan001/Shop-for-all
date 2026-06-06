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
        <div className="mb-8 space-y-6">
            {Object.entries(availableAttributes).map(([attrName, values]) => (
                <div key={attrName}>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3 flex items-center">
                        {attrName}
                        <span className="ml-3 h-px flex-1 bg-gray-200" />
                    </h3>
                    <div className="flex flex-wrap gap-3">
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
                                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm
                                        ${isSelected
                                        ? 'bg-gray-900 text-white shadow-gray-900/20 scale-[1.02] ring-2 ring-gray-900 ring-offset-1'
                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-900 hover:bg-gray-50'
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
