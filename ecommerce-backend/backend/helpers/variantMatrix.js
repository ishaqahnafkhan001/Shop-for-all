'use strict';

/**
 * variantMatrix.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers for the "variant matrix" system.
 *
 * Instead of manually listing every combination (black+S, black+M, white+S…),
 * callers describe the attribute *dimensions* and the system generates all
 * combinations via cartesian product.
 *
 * Example input:
 *   attributes: [
 *     { name: "color", options: ["black", "white"] },
 *     { name: "size",  options: ["s", "m", "l", "xl"] }
 *   ]
 *
 * Generates 8 variants. Each can be individually overridden via the
 * `overrides` map, keyed by pipe-joined option values: "black|s", "white|xl"…
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Cartesian product ────────────────────────────────────────────────────────

/**
 * Recursively generate cartesian product of attribute definitions.
 *
 * @param  {Array<{name:string, options:string[]}>} attributeDefs
 * @returns {Array<Array<{name:string, value:string}>>}
 *
 * cartesian([{name:"color",options:["black","white"]},{name:"size",options:["s","m"]}])
 *  → [
 *      [{name:"color",value:"black"},{name:"size",value:"s"}],
 *      [{name:"color",value:"black"},{name:"size",value:"m"}],
 *      [{name:"color",value:"white"},{name:"size",value:"s"}],
 *      [{name:"color",value:"white"},{name:"size",value:"m"}],
 *    ]
 */
function cartesian(attributeDefs) {
    if (!attributeDefs || attributeDefs.length === 0) return [[]];

    function recurse(index) {
        if (index === attributeDefs.length) return [[]];
        const { name, options } = attributeDefs[index];
        const tail = recurse(index + 1);
        const result = [];
        for (const opt of options) {
            for (const combo of tail) {
                result.push([{ name, value: opt }, ...combo]);
            }
        }
        return result;
    }

    return recurse(0);
}

// ─── Stable key helpers ───────────────────────────────────────────────────────

/**
 * Build a stable lookup key from a variant's attributes array.
 * Sorted by attribute name so order doesn't matter.
 *
 * [{name:"size",value:"m"},{name:"color",value:"black"}] → "color:black|size:m"
 *
 * Used to match incoming variants against existing DB variants.
 */
function makeVariantKey(attributes) {
    return [...attributes]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => `${a.name}:${a.value}`)
        .join('|');
}

/**
 * Build the user-facing pipe key from an attribute combo array.
 * Preserves definition order (not sorted).
 *
 * [{name:"color",value:"black"},{name:"size",value:"m"}] → "black|m"
 *
 * Used to look up overrides in the input payload.
 */
function makePipeKey(attributes) {
    return attributes.map(a => a.value).join('|');
}

// ─── Matrix expansion ─────────────────────────────────────────────────────────

/**
 * Expand a variantMatrix config into a flat variants array ready for MongoDB.
 *
 * @param {Object} matrix
 * @param {Array<{name:string, options:string[]}>} matrix.attributes
 * @param {number} [matrix.defaultStock=0]   - stock for combinations not in overrides
 * @param {number} [matrix.defaultPrice]     - priceOverride applied to all (optional)
 * @param {Object} [matrix.overrides]        - { "black|m": { stock, priceOverride, image, sku, isActive } }
 *
 * @param {Map<string,number>} [existingStockMap]
 *   Map<stableKey, stock> from the current DB document.
 *   When provided, matching variants KEEP their existing stock instead of
 *   receiving defaultStock — so re-generating the matrix doesn't wipe real data.
 *
 * @returns {Array} variants
 */
function expandMatrix(matrix, existingStockMap = new Map()) {
    const {
        attributes,
        defaultStock = 0,
        defaultPrice,
        overrides = {}
    } = matrix;

    const combinations = cartesian(attributes);

    return combinations.map(attrCombo => {
        const pipeKey   = makePipeKey(attrCombo);    // "black|m"   — used in overrides map
        const stableKey = makeVariantKey(attrCombo); // "color:black|size:m" — used for DB match

        const override = overrides[pipeKey] || {};

        // Stock priority: explicit override → existing DB stock → defaultStock
        const stock =
            override.stock !== undefined      ? override.stock :
                existingStockMap.has(stableKey)   ? existingStockMap.get(stableKey) :
                    defaultStock;

        const variant = {
            attributes: attrCombo,
            stock,
            isActive: override.isActive ?? true
        };

        // Only set optional fields when they have a value
        const priceOverride = override.priceOverride ?? defaultPrice;
        if (priceOverride !== undefined) variant.priceOverride = priceOverride;
        if (override.image)              variant.image         = override.image;
        if (override.sku)                variant.sku           = override.sku;

        return variant;
    });
}

// ─── addAttributeOption helper ────────────────────────────────────────────────

/**
 * Given existing product variants and a new attribute option to add,
 * generate only the NEW variant combinations.
 *
 * Example: product already has color×size.
 * Adding color "red" → generates red+s, red+m, red+l, red+xl
 * (not the full matrix, only the rows for "red").
 *
 * @param {Array}  existingVariants  — product.variants from DB
 * @param {string} attrName          — e.g. "color"
 * @param {string} attrValue         — e.g. "red"
 * @param {number} [defaultStock=0]
 * @param {number} [defaultPrice]
 *
 * @returns {{ newVariants: Array, error: string|null }}
 */
function generateNewOptionCombos(existingVariants, attrName, attrValue, defaultStock = 0, defaultPrice) {
    // Build dimension map from existing variants
    const dimensionMap = new Map(); // name → Set<value>
    for (const v of existingVariants) {
        for (const a of v.attributes) {
            if (!dimensionMap.has(a.name)) dimensionMap.set(a.name, new Set());
            dimensionMap.get(a.name).add(a.value);
        }
    }

    if (!dimensionMap.has(attrName)) {
        return {
            newVariants: [],
            error: `Attribute "${attrName}" does not exist on this product. Use variantMatrix to fully redefine variants.`
        };
    }

    if (dimensionMap.get(attrName).has(attrValue)) {
        return {
            newVariants: [],
            error: `Option "${attrValue}" already exists for attribute "${attrName}".`
        };
    }

    // Cross the new value with all other dimension options
    const otherDims = [...dimensionMap.entries()]
        .filter(([name]) => name !== attrName)
        .map(([name, values]) => ({ name, options: [...values] }));

    let newCombos;
    if (otherDims.length === 0) {
        // Product only has one attribute dimension
        newCombos = [[{ name: attrName, value: attrValue }]];
    } else {
        const otherCombinations = cartesian(otherDims);
        newCombos = otherCombinations.map(combo => [
            { name: attrName, value: attrValue },
            ...combo
        ]);
    }

    const newVariants = newCombos.map(attrCombo => {
        const variant = { attributes: attrCombo, stock: defaultStock, isActive: true };
        if (defaultPrice !== undefined) variant.priceOverride = defaultPrice;
        return variant;
    });

    return { newVariants, error: null };
}

module.exports = {
    cartesian,
    makeVariantKey,
    makePipeKey,
    expandMatrix,
    generateNewOptionCombos
};