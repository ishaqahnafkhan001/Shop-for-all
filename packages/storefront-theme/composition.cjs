'use strict';

// Composition identities are independent of preset IDs. Presets select one on
// application; saved stores never acquire a new layout merely from their ID.
const HOMEPAGE_COMPOSITIONS = Object.freeze({
    standard: Object.freeze({ label: 'Standard', slots: Object.freeze({}) }),
    discovery: Object.freeze({ label: 'Product discovery', slots: Object.freeze({ companion: Object.freeze(['CategoryList']) }) }),
    editorial: Object.freeze({ label: 'Editorial', slots: Object.freeze({ companion: Object.freeze(['BrandStory']) }) }),
    boutique: Object.freeze({ label: 'Boutique', slots: Object.freeze({ collection: Object.freeze(['CollectionShowcase', 'Collection']), story: Object.freeze(['BrandStory']) }) }),
});

const getHomepageComposition = (value) => Object.hasOwn(HOMEPAGE_COMPOSITIONS, value) ? value : 'standard';

// Stable partition: each enabled section appears exactly once. Viewport-specific
// sections stay in the normal flow so a hidden companion cannot leave an empty
// desktop column. Unclaimed sections retain merchant order and original indexes.
const planHomepageComposition = ({ composition, sections = [], isAvailable = () => true } = {}) => {
    const id = getHomepageComposition(composition);
    const remaining = sections.map((section, index) => ({ section, index }));
    const slots = {};
    for (const [slot, types] of Object.entries(HOMEPAGE_COMPOSITIONS[id].slots)) {
        const index = remaining.findIndex(({ section }) => types.includes(section.type)
            && section.isEnabled !== false && section.desktopSettings?.isVisible !== false
            && section.mobileSettings?.isVisible !== false && isAvailable(section));
        if (index >= 0) slots[slot] = remaining.splice(index, 1)[0];
    }
    return { id, slots, remaining };
};

module.exports = { HOMEPAGE_COMPOSITIONS, getHomepageComposition, planHomepageComposition };
