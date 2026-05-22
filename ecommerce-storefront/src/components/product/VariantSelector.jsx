"use client";
import React, { memo } from 'react';

const VariantSelector = memo(function VariantSelector({ availableAttributes, selectedAttributes, onSelect }) {
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
                            return (
                                <button
                                    key={value}
                                    onClick={() => onSelect(attrName, value)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm
                                        ${isSelected
                                        ? 'bg-gray-900 text-white shadow-gray-900/20 scale-[1.02] ring-2 ring-gray-900 ring-offset-1'
                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-900 hover:bg-gray-50'
                                    }`}
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