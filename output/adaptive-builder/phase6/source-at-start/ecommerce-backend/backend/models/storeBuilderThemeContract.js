'use strict';

const mongoose = require('mongoose');
const { normalizeStoredTheme, validateStoredTheme } = require('@scaleup/storefront-theme');
const { validateCompleteThemeBudget, validatePageTemplates } = require('@scaleup/storefront-theme/adaptive');

const themeError = (code, message) => Object.assign(new Error(message), { code, statusCode: 409 });
const plain = value => value?.toObject ? value.toObject({ flattenMaps: true }) : value;
// Atomic JSON value: Mongoose must not recursively minimize empty contract maps.
// Public serialization and BSON both expose detached ordinary JSON, not methods.
class AtomicJson {
    constructor(value) { Object.assign(this, value); }
    toJSON() { return JSON.parse(JSON.stringify({ ...this })); }
    toObject() { return this.toJSON(); }
    toBSON() { return this.toJSON(); }
    valueOf() { return this.toJSON(); }
}
const assertSnapshot = value => {
    const theme = plain(value) || {};
    if (Number(theme.version) <= 4 && !Object.hasOwn(theme, 'siteBuilder')) return;
    if (theme.siteBuilder && !validateCompleteThemeBudget(plain(theme.siteBuilder)).valid) throw themeError('INVALID_ADAPTIVE_THEME', 'Adaptive data must be plain JSON.');
    // BSON dates/IDs in existing legacy fields have a canonical JSON encoding.
    // The adaptive subtree itself must already be plain JSON, checked above.
    const validation = validateStoredTheme(JSON.parse(JSON.stringify(theme)));
    if (!validation.valid) throw Object.assign(themeError('INVALID_ADAPTIVE_THEME', 'Invalid persisted adaptive theme.'), { validation: validation.errors });
};
class SiteBuilderDocument extends mongoose.SchemaType {
    // Mixed instance semantics tell Mongoose to validate one atomic value rather
    // than applying a whole-document validator to each flattened leaf. The cast
    // and model guards still reject invalid graphs, even without runValidators.
    constructor(path, options) { super(path, options, 'Mixed'); }
    cast(value) {
        if (value === undefined) return value;
        const json = value instanceof AtomicJson ? value.toJSON() : value;
        if (!validateCompleteThemeBudget(json).valid) throw themeError('INVALID_ADAPTIVE_THEME', 'siteBuilder must be bounded plain JSON.');
        const structural = validatePageTemplates(json).errors.filter(error => error.code !== 'CONTRAST');
        if (structural.length) throw Object.assign(themeError('INVALID_ADAPTIVE_THEME', 'Invalid adaptive graph.'), { validation: structural });
        return new AtomicJson(JSON.parse(JSON.stringify(json)));
    }
}
class ThemeSnapshot extends mongoose.SchemaType {
    constructor(path, options) { super(path, options, 'Mixed'); }
    cast(value) {
        const result = plain(value); assertSnapshot(result);
        const json = JSON.parse(JSON.stringify(result));
        return Number(json.version) === 5 ? new AtomicJson(json) : json;
    }
}
mongoose.Schema.Types.SiteBuilderDocument = SiteBuilderDocument;
mongoose.Schema.Types.ThemeSnapshot = ThemeSnapshot;
const assertCompleteThemeWrite = (current, incoming) => {
    if (Number(current?.version) === 5 && (Number(incoming?.version) !== 5 || !incoming?.siteBuilder)) {
        throw themeError('THEME_CLIENT_UPGRADE_REQUIRED', 'This design requires a v5-aware editor. Reload before saving; downgrade is not supported.');
    }
    assertSnapshot(current); assertSnapshot(incoming);
};

// Protect non-Builder writers as well. The service still owns authorization and
// transactions; this model boundary prevents lossy replacements and bad graphs.
const installThemeGuard = (schema, { draft = false, revision = false } = {}) => {
    if (draft) schema.post('init', function () { this.$locals.draftLoadedAt = this.updatedAt?.getTime(); });
    schema.pre('validate', function () { assertSnapshot(plain(this.theme)); });
    schema.pre('save', async function () {
        const castError = Object.entries(this.$errors || {}).find(([key]) => key === 'theme' || key.startsWith('theme.'))?.[1];
        if (castError) throw castError;
        if (schema.path('theme')?.isRequired && this.theme == null) throw themeError('INVALID_ADAPTIVE_THEME', 'A complete theme snapshot is required.');
        assertSnapshot(plain(this.theme)); // Also enforce when validateBeforeSave is false.
        if (this.isNew || !this.isModified('theme')) return;
        if (revision) throw themeError('THEME_REVISION_IMMUTABLE', 'Publish a new revision instead of changing a retained snapshot.');
        const current = await this.constructor.findById(this._id).select('theme themeRevision updatedAt').session(this.$session() || null).lean();
        if (!current) return;
        assertCompleteThemeWrite(current.theme, plain(this.theme));
        this.$where = { ...(this.$where || {}), 'theme.version': current.theme?.version ?? { $exists: false } };
        if (Number(current.theme?.version) === 5) {
            if (draft) {
                if (this.$locals.draftLoadedAt !== current.updatedAt?.getTime()) throw themeError('DRAFT_CONFLICT', 'Reload the current draft before saving.');
                this.$where = { ...(this.$where || {}), updatedAt: current.updatedAt };
                return;
            }
            if (!this.isSelected('themeRevision') || Number(this.themeRevision) !== Number(current.themeRevision)) throw themeError('THEME_CONFLICT', 'Reload the current design before saving.');
            this.$where = { ...(this.$where || {}), themeRevision: current.themeRevision, 'theme.version': 5 };
        }
    });
    schema.pre(['updateOne', 'findOneAndUpdate', 'replaceOne'], async function () {
        const update = this.getUpdate() || {};
        if (Array.isArray(update)) throw themeError('ADAPTIVE_COMPLETE_CANDIDATE_REQUIRED', 'Pipeline theme writes are not supported.');
        const set = update.$set || update;
        const keys = Object.keys(set);
        const touches = keys.some(key => key === 'theme' || key.startsWith('theme.'))
            || Object.keys(update.$unset || {}).some(key => key === 'theme' || key.startsWith('theme.'));
        if (!touches) return;
        if (revision) throw themeError('THEME_REVISION_IMMUTABLE', 'Publish a new revision instead of changing a retained snapshot.');
        const current = await this.model.findOne(this.getFilter()).select('theme themeRevision updatedAt').session(this.getOptions().session || null).lean();
        const adaptive = Number(current?.theme?.version) === 5 || Number(set.theme?.version) === 5
            || keys.some(key => key === 'theme.siteBuilder' || key.startsWith('theme.siteBuilder.'));
        if (set.theme) assertCompleteThemeWrite(current?.theme, set.theme);
        if (set.theme) {
            // Fence the race where adoption commits after an old writer reads v4.
            this.setQuery({ $and: [this.getFilter(), { 'theme.version': current?.theme?.version ?? { $exists: false } }] });
        }
        if (!adaptive) return;
        if (!set.theme) {
            // Narrow existing SEO updates are the only supported partial graph-era
            // query writes; arbitrary dotted writes could bypass graph validation.
            if (keys.some(key => key.startsWith('theme.') && key !== 'theme.seo') || Object.keys(update.$unset || {}).some(key => key.startsWith('theme'))) {
                throw themeError('ADAPTIVE_COMPLETE_CANDIDATE_REQUIRED', 'Use a validated complete theme candidate for this change.');
            }
            assertSnapshot({ ...current.theme, ...(set['theme.seo'] ? { seo: set['theme.seo'] } : {}) });
        }
        if (current) this.setQuery({ $and: [this.getFilter(), draft ? { updatedAt: current.updatedAt } : { themeRevision: current.themeRevision }] });
    });
};
module.exports = { SiteBuilderDocument, ThemeSnapshot, assertSnapshot, assertCompleteThemeWrite, installThemeGuard, themeError, normalizeStoredTheme };
