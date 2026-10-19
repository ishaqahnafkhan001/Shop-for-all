export const aiSourceLabel = source => ({ provider: 'AI generated', deterministic_fallback: 'Generated from store details',
    mixed: 'AI copy with application suggestions', manual: 'Edited by you', unknown_legacy: 'Earlier suggestion; origin unknown' }[source] || 'Origin unavailable');
