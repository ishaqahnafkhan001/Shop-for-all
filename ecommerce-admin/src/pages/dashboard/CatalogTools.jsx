import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, CheckSquare2, Download, Edit3, Image as ImageIcon, Images, Layers, Loader2, Package, RefreshCcw, Search, SlidersHorizontal, Sparkles, Trash2, Upload, Wand2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import Modal from '../../components/ui/Modal.jsx';
import PageRefreshButton from '../../components/ui/PageRefreshButton.jsx';
import { useAiOperation } from '../../hooks/useAiOperation.js';
import { useAiUndo } from '../../hooks/useAiUndo.js';
import AiOperationStatus, { AiFieldComparison } from '../../components/ai/AiOperationStatus.jsx';
import { csvToProducts, MAX_CATALOG_IMPORT_ROWS } from '../../utils/catalogCsv.js';

const emptyCollectionForm = {
    title: '',
    slug: '',
    description: '',
    image: '',
    isActive: true,
    seo: {
        title: '',
        description: ''
    }
};

const emptyBulkForm = {
    category: '',
    status: '',
    visibility: '',
    tags: '',
    tagsMode: 'add',
    discount: '',
    sellingPricePercent: '',
    buyingPricePercent: '',
    lowStockThreshold: ''
};

const dedupeCategories = (items = []) => {
    const categoriesByIdentity = new Map();
    items.forEach(category => {
        const identity = String(category?.name || '')
            .normalize('NFKC')
            .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        if (!identity) return;

        const current = categoriesByIdentity.get(identity);
        if (!current || (!current.image && category.image)) categoriesByIdentity.set(identity, category);
    });
    return [...categoriesByIdentity.values()];
};

const lowStockVariantCount = (product) => {
    if (product.lowStockVariantCount !== undefined) return Number(product.lowStockVariantCount) || 0;
    return (product.variants || []).filter(variant => Number(variant.stock || 0) <= Number(
        variant.inventory?.lowStockThreshold ?? product.lowStockThreshold ?? 5
    )).length;
};

const CatalogTools = () => {
    const [products, setProducts] = useState([]);
    const [productStats, setProductStats] = useState({ total: 0, published: 0, lowStockProducts: 0, lowStockVariants: 0 });
    const [productTotal, setProductTotal] = useState(0);
    const [productNames, setProductNames] = useState({});
    const [bulkPreview, setBulkPreview] = useState(null);
    const [activity, setActivity] = useState([]);
    const [activityError, setActivityError] = useState('');
    const [collections, setCollections] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selected, setSelected] = useState([]);
    const [collectionMembers, setCollectionMembers] = useState([]);
    const [collectionBaseline, setCollectionBaseline] = useState(JSON.stringify({ form: emptyCollectionForm, members: [] }));
    const [activeView, setActiveView] = useState('products');
    const [sortOrder, setSortOrder] = useState('title');
    const [page, setPage] = useState(1);
    const [loadError, setLoadError] = useState('');
    const loadSequence = useRef(0);
    const [importDraft, setImportDraft] = useState(null);
    const [importMode, setImportMode] = useState('create');
    const [importBusy, setImportBusy] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const importLock = useRef(false);
    const [categorySearch, setCategorySearch] = useState('');
    const [savedViews, setSavedViews] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('');
    const [exportScope, setExportScope] = useState('all');
    const [bulk, setBulk] = useState(emptyBulkForm);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [collectionForm, setCollectionForm] = useState(emptyCollectionForm);
    const [editingCollectionId, setEditingCollectionId] = useState('');
    const [collectionImageFile, setCollectionImageFile] = useState(null);
    const [collectionImagePreview, setCollectionImagePreview] = useState('');
    const [removeCollectionImage, setRemoveCollectionImage] = useState(false);
    const [collectionSaving, setCollectionSaving] = useState(false);
    const [categorySavingId, setCategorySavingId] = useState('');
    const [categoryPhotoPicker, setCategoryPhotoPicker] = useState({
        category: null,
        images: [],
        loading: false,
        error: ''
    });
    const [categorySeoEditor, setCategorySeoEditor] = useState({
        category: null,
        name: '',
        title: '',
        description: '',
        saving: false
    });
    const [collectionAi, setCollectionAi] = useState({
        loading: false,
        error: '',
        suggestion: null
    });

    const collectionDirty = JSON.stringify({ form: collectionForm, members: collectionMembers }) !== collectionBaseline || Boolean(collectionImageFile) || removeCollectionImage;
    useEffect(() => {
        if (!collectionDirty) return;
        const warn = event => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [collectionDirty]);

    const operationInput = { form: collectionForm, products: [...collectionMembers].sort() };
    const operation = useAiOperation({ feature: 'catalog.collection', entity: editingCollectionId || 'new-collection', input: operationInput });
    const undo = useAiUndo(editingCollectionId, collectionForm, setCollectionForm);
    const selectedCount = selected.length;
    const hasBulkChanges = bulk.tagsMode === 'clear' || Object.entries(bulk)
        .some(([field, value]) => field !== 'tagsMode' && String(value).trim() !== '');

    const filteredProducts = products;
    const pagedProducts = products;

    const visibleProductIds = useMemo(
        () => pagedProducts.map(product => String(product._id)),
        [pagedProducts]
    );

    const visibleSelectedCount = visibleProductIds.filter(id => selected.includes(id)).length;
    const allVisibleSelected = visibleProductIds.length > 0 && visibleSelectedCount === visibleProductIds.length;
    const hasProductFilters = Boolean(searchQuery || categoryFilter || statusFilter || stockFilter || visibilityFilter);

    const loadData = async () => {
        setLoading(true);
        const sequence = ++loadSequence.current;
        const [productsResult, collectionsResult, categoriesResult] = await Promise.allSettled([
            API.get('/admin/catalog/products', { params: { page, search: searchQuery, category: categoryFilter, status: statusFilter ? statusFilter[0].toUpperCase() + statusFilter.slice(1) : '', stock: stockFilter, visibility: visibilityFilter, sort: sortOrder } }),
            API.get('/admin/collections'),
            API.get('/admin/categories')
        ]);

        if (sequence !== loadSequence.current) return;
        const failedSections = [];
        if (productsResult.status === 'fulfilled') {
            const productsRes = productsResult.value;
            setProducts(productsRes.data.data || []);
            setProductTotal(productsRes.data.pagination?.total || 0);
            setPage(current => Math.min(current, Math.max(1, productsRes.data.pagination?.totalPages || 1)));
            setProductStats(productsRes.data.summary || { total: 0, published: 0, lowStockProducts: 0, lowStockVariants: 0 });
            setProductNames(previous => ({ ...previous, ...Object.fromEntries((productsRes.data.data || []).map(product => [String(product._id), product.title])) }));
        } else {
            failedSections.push('products');
        }

        if (collectionsResult.status === 'fulfilled') {
            const collectionsRes = collectionsResult.value;
            setCollections(collectionsRes.data.data || []);
        } else {
            failedSections.push('collections');
        }

        if (categoriesResult.status === 'fulfilled') {
            const categoriesRes = categoriesResult.value;
            setCategories(dedupeCategories(categoriesRes.data.data || []));
        } else if (productsResult.status === 'fulfilled') {
            const productsPayload = productsResult.value.data || {};
            const fallbackCategories = productsPayload.categoryDetails
                || (productsPayload.categories || []).map(name => ({ name, slug: name, image: '', productCount: 0 }));
            setCategories(dedupeCategories(fallbackCategories));
            failedSections.push('category covers');
        } else {
            failedSections.push('category covers');
        }

        setLoadError(failedSections.length ? `Could not load ${failedSections.join(', ')}. Retry to get current data.` : '');
        if (failedSections.length > 0) {
            toast.error(`Could not load ${failedSections.join(', ')}. Your other catalog data is still available.`);
        }
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(loadData, 250);
        return () => { clearTimeout(timer); loadSequence.current += 1; };
    // loadData reads the current filters; request sequence discards stale responses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, searchQuery, categoryFilter, statusFilter, stockFilter, visibilityFilter, sortOrder]);

    const toggleProduct = (id) => {
        const normalizedId = String(id);
        setSelected(prev => (
            prev.includes(normalizedId) ? prev.filter(item => item !== normalizedId) : [...prev, normalizedId]
        ));
    };

    const toggleAllVisible = () => {
        setSelected(prev => {
            if (allVisibleSelected) {
                return prev.filter(id => !visibleProductIds.includes(String(id)));
            }

            return [...new Set([...prev.map(String), ...visibleProductIds])];
        });
    };

    const clearSelection = () => setSelected([]);

    const resetProductFilters = () => {
        setPage(1);
        setSearchQuery('');
        setCategoryFilter('');
        setStatusFilter('');
        setStockFilter('');
        setVisibilityFilter('');
    };

    const exportCsv = async () => {
        if (exportScope === 'selected' && !selected.length) { toast.error('Select products to export first.'); return; }
        try {
            const response = await API.get('/admin/products/export.csv', { responseType: 'blob', params: exportScope === 'selected' ? { ids: selected.join(',') } : exportScope === 'filtered' ? { search: searchQuery, category: categoryFilter, status: statusFilter ? statusFilter[0].toUpperCase() + statusFilter.slice(1) : '', stock: stockFilter, visibility: visibilityFilter } : {} });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url; link.download = 'product-summary.csv'; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { toast.error('Export failed. Please retry.'); }
    };

    const importCsv = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || importLock.current) return;
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error('Choose a CSV smaller than 5 MB.');
            const imported = csvToProducts(await file.text());
            if (!imported.length || imported.length > MAX_CATALOG_IMPORT_ROWS) throw new Error(`Choose a CSV with 1–${MAX_CATALOG_IMPORT_ROWS} products.`);
            setImportDraft({ rows: imported, key: crypto.randomUUID(), name: file.name });
            setImportResult(null);
            setActiveView('transfer');
        } catch (err) { toast.error(err.message || 'Cannot read CSV'); }
    };

    const runImport = async (preview) => {
        if (!importDraft || importLock.current) return;
        importLock.current = true; setImportBusy(true);
        try {
            const { data } = await API.post('/admin/products/bulk-import', { products: importDraft.rows, mode: importMode, dryRun: preview, operationId: importDraft.key });
            setImportResult(data);
            if (!preview) {
                toast.success(`${data.count} products ${importMode === 'update' ? 'updated' : 'created'}.`);
                setImportDraft(null); await loadData();
            }
        } catch (err) {
            setImportResult(err.response?.data || { error: 'Connection interrupted. Retry this same import safely.' });
        } finally { importLock.current = false; setImportBusy(false); }
    };

    const applyBulkUpdate = async () => {
        if (selectedCount === 0) {
            toast.error('Select at least one product before applying a bulk update.');
            return;
        }

        const updates = {};
        const changedFields = [];
        if (bulk.category.trim()) {
            updates.category = bulk.category.trim();
            changedFields.push(`Category: ${updates.category}`);
        }
        if (bulk.status) updates.status = bulk.status;
        if (bulk.status) changedFields.push(`Status: ${bulk.status}`);
        if (bulk.visibility) {
            updates.isActive = bulk.visibility === 'show';
            changedFields.push(`Storefront visibility: ${bulk.visibility}`);
        }

        if (bulk.tagsMode === 'clear') {
            updates.tags = [];
            updates.tagsMode = 'clear';
            changedFields.push('Remove all tags');
        } else if (bulk.tags.trim()) {
            const tags = [...new Set(bulk.tags.split(/[,\n]/).map(tag => tag.trim().toLowerCase()).filter(Boolean))];
            if (tags.length > 30 || tags.some(tag => tag.length > 60)) {
                toast.error('Use up to 30 tags, with 60 characters or fewer per tag.');
                return;
            }
            updates.tags = tags;
            updates.tagsMode = bulk.tagsMode;
            changedFields.push(`${bulk.tagsMode} ${tags.length} tag${tags.length === 1 ? '' : 's'}`);
        }

        if (bulk.lowStockThreshold !== '') {
            const threshold = Number(bulk.lowStockThreshold);
            if (!Number.isInteger(threshold) || threshold < 0) {
                toast.error('Low-stock alert level must be a whole number of 0 or more.');
                return;
            }
            updates.lowStockThreshold = threshold;
            changedFields.push(`Every variant alert level: ${threshold}`);
        }

        if (bulk.discount !== '') {
            const discount = Number(bulk.discount);
            if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
                toast.error('Discount must be between 0 and 100%.');
                return;
            }
            updates.pricing = { discount };
            changedFields.push(`Discount: ${discount}%`);
        }

        for (const [field, label] of [
            ['sellingPricePercent', 'Selling price'],
            ['buyingPricePercent', 'Buying cost']
        ]) {
            if (bulk[field] === '') continue;
            const percent = Number(bulk[field]);
            if (!Number.isFinite(percent) || percent < -90 || percent > 500) {
                toast.error(`${label} adjustment must be between -90% and +500%.`);
                return;
            }
            updates[field] = percent;
            changedFields.push(`${label}: ${percent >= 0 ? '+' : ''}${percent}%`);
        }

        if (Object.keys(updates).length === 0) {
            toast.error('Choose at least one change before applying a bulk update.');
            return;
        }

        setBulkSaving(true);
        try {
            const { data } = await API.patch('/admin/products/bulk', { productIds: selected, updates, dryRun: true });
            setBulkPreview({ rows: data.preview, updates, ids: [...selected], changes: changedFields });
        } catch (err) { toast.error(err.response?.data?.error || 'Could not preview changes'); }
        finally { setBulkSaving(false); }
    };

    const commitBulk = async () => {
        if (!bulkPreview || bulkSaving) return;
        setBulkSaving(true);
        try {
            const response = await API.patch('/admin/products/bulk', { productIds: bulkPreview.rows.map(row => row.id), updates: bulkPreview.updates, expectedVersions: Object.fromEntries(bulkPreview.rows.map(row => [row.id, row.version])) });
            toast.success(`${response.data.count} products updated.`);
            setSelected([]); setBulk(emptyBulkForm); setBulkPreview(null);
            await loadData();
        } catch (err) { toast.error(err.response?.data?.error || 'Bulk update failed'); }
        finally { setBulkSaving(false); }
    };

    const loadActivity = async () => {
        try { const { data } = await API.get('/admin/catalog/activity'); setActivity(data.data); setActivityError(''); }
        catch { setActivityError('Could not load history. Please retry.'); }
    };
    const undoOperation = async (id) => {
        if (!window.confirm('Restore the values before this bulk operation? This is allowed only if every affected product is unchanged since then.')) return;
        try { await API.post(`/admin/catalog/activity/${id}/undo`); await loadActivity(); await loadData(); toast.success('Bulk operation undone.'); }
        catch (err) { toast.error(err.response?.data?.error || 'Could not undo operation'); }
    };

    const releaseCollectionPreview = () => {
        if (collectionImagePreview.startsWith('blob:')) URL.revokeObjectURL(collectionImagePreview);
    };

    const resetCollectionEditor = (force = false) => {
        if (!force && collectionDirty && !window.confirm('Discard unsaved collection changes?')) return;
        setCollectionBaseline(JSON.stringify({ form: emptyCollectionForm, members: [] }));
        undo.clear();
        operation.cancel();
        releaseCollectionPreview();
        setCollectionForm(emptyCollectionForm);
        setEditingCollectionId('');
        setCollectionImageFile(null);
        setCollectionImagePreview('');
        setRemoveCollectionImage(false);
        setCollectionAi({ loading: false, error: '', suggestion: null });
        setCollectionMembers([]);
    };

    const handleCollectionImageChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            toast.error('Choose a JPEG, PNG, or WebP image up to 5 MB.');
            return;
        }
        releaseCollectionPreview();
        setCollectionImageFile(file);
        setCollectionImagePreview(URL.createObjectURL(file));
        setRemoveCollectionImage(false);
    };

    const beginCollectionEdit = (collection) => {
        if (collectionDirty && !window.confirm('Discard unsaved collection changes and edit this collection?')) return;
        releaseCollectionPreview();
        setEditingCollectionId(collection._id);
        const nextForm = {
            title: collection.title || '',
            slug: collection.slug || '',
            description: collection.description || '',
            image: collection.image || '',
            isActive: collection.isActive !== false,
            seo: {
                title: collection.seo?.title || '',
                description: collection.seo?.description || ''
            }
        };
        setCollectionForm(nextForm);
        setProductNames(previous => ({ ...previous, ...(collection.memberNames || {}) }));
        setCollectionBaseline(JSON.stringify({ form: nextForm, members: (collection.productIds || []).map(item => String(item?._id || item)) }));
        setCollectionImageFile(null);
        setCollectionImagePreview(collection.image || '');
        setRemoveCollectionImage(false);
        setCollectionMembers((collection.productIds || []).map(item => String(item?._id || item)));
        setActiveView('collections');
        setCollectionAi({ loading: false, error: '', suggestion: null });
        window.requestAnimationFrame(() => document.getElementById('collection-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    const saveCollection = async (event) => {
        event.preventDefault();
        if (collectionSaving) return;
        setCollectionSaving(true);
        try {
            const payload = new FormData();
            payload.append('title', collectionForm.title);
            payload.append('slug', collectionForm.slug);
            payload.append('description', collectionForm.description);
            payload.append('isActive', String(collectionForm.isActive !== false));
            payload.append('seo', JSON.stringify(collectionForm.seo || {}));
            payload.append('productIds', JSON.stringify(collectionMembers));
            if (collectionImageFile) payload.append('image', collectionImageFile);
            if (removeCollectionImage) payload.append('removeImage', 'true');

            if (editingCollectionId) {
                await API.patch(`/admin/collections/${editingCollectionId}`, payload);
                toast.success('Collection updated.');
            } else {
                await API.post('/admin/collections', payload);
                toast.success('Collection created from selected products.');
            }
            resetCollectionEditor(true);
            await loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || `Failed to ${editingCollectionId ? 'update' : 'create'} collection`);
        } finally {
            setCollectionSaving(false);
        }
    };

    const deleteCollection = async (collection) => {
        if (!window.confirm(`Delete "${collection.title}"? Products will not be deleted.`)) return;
        try {
            await API.delete(`/admin/collections/${collection._id}`);
            if (editingCollectionId === collection._id) resetCollectionEditor(true);
            setCollections(prev => prev.filter(item => item._id !== collection._id));
            toast.success('Collection deleted.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete collection');
        }
    };

    const saveCategoryCover = async (category, file) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            toast.error('Choose a JPEG, PNG, or WebP image up to 5 MB.');
            return;
        }
        const key = String(category._id || category.name);
        setCategorySavingId(key);
        try {
            const payload = new FormData();
            payload.append('categoryName', category.name);
            payload.append('altText', `${category.name} category`);
            payload.append('coverImage', file);
            const { data } = await API.post('/admin/categories/cover', payload);
            setCategories(prev => prev.map(item => (
                item.name === category.name ? { ...item, ...(data.data || {}) } : item
            )));
            toast.success(`${category.name} cover updated.`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update category cover');
        } finally {
            setCategorySavingId('');
        }
    };

    const removeCategoryCover = async (category) => {
        if (!category._id || !category.image || !window.confirm(`Remove the cover from "${category.name}"?`)) return;
        const key = String(category._id);
        setCategorySavingId(key);
        try {
            const { data } = await API.delete(`/admin/categories/${category._id}/cover`);
            setCategories(prev => prev.map(item => (
                item._id === category._id ? { ...item, ...(data.data || {}), image: '' } : item
            )));
            toast.success('Category cover removed.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove category cover');
        } finally {
            setCategorySavingId('');
        }
    };

    const openCategoryPhotoPicker = async (category) => {
        setCategoryPhotoPicker({ category, images: [], loading: true, error: '' });
        try {
            const { data } = await API.get('/admin/categories/images', {
                params: { category: category.name }
            });
            setCategoryPhotoPicker({
                category,
                images: data.data || [],
                loading: false,
                error: ''
            });
        } catch (err) {
            setCategoryPhotoPicker({
                category,
                images: [],
                loading: false,
                error: err.response?.data?.error || 'Product photos could not be loaded.'
            });
        }
    };

    const selectCategoryProductPhoto = async (image) => {
        const category = categoryPhotoPicker.category;
        if (!category || !image?.url || !image?.productId) return;
        const key = String(category._id || category.name);
        setCategorySavingId(key);
        try {
            const { data } = await API.post('/admin/categories/cover', {
                categoryName: category.name,
                sourceProductId: image.productId,
                imageUrl: image.url,
                altText: image.altText || `${category.name} category`
            });
            setCategories(prev => prev.map(item => (
                item.name === category.name ? { ...item, ...(data.data || {}) } : item
            )));
            setCategoryPhotoPicker({ category: null, images: [], loading: false, error: '' });
            toast.success(`${category.name} cover updated from a product photo.`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to use product photo');
        } finally {
            setCategorySavingId('');
        }
    };

    const openCategorySeoEditor = (category) => {
        setCategorySeoEditor({
            category,
            name: category.name || '',
            altText: category.coverImage?.altText || '',
            title: category.seo?.title || '',
            description: category.seo?.description || '',
            saving: false
        });
    };

    const saveCategorySeo = async (event) => {
        event.preventDefault();
        const category = categorySeoEditor.category;
        if (!category || categorySeoEditor.saving) return;
        setCategorySeoEditor(prev => ({ ...prev, saving: true }));
        try {
            const { data } = await API.put('/admin/categories/metadata', {
                categoryName: category.name,
                name: categorySeoEditor.name,
                altText: categorySeoEditor.altText || '',
                seo: {
                    title: categorySeoEditor.title,
                    description: categorySeoEditor.description
                }
            });
            setCategories(prev => prev.map(item => (
                item.name === category.name ? { ...item, ...(data.data || {}) } : item
            )));
            setCategorySeoEditor({ category: null, name: '', title: '', description: '', saving: false });
            setCategoryFilter(current => current === category.name ? (data.data?.name || categorySeoEditor.name) : current);
            setPage(1);
            await loadData();
            toast.success('Category details updated.');
        } catch (err) {
            setCategorySeoEditor(prev => ({ ...prev, saving: false }));
            toast.error(err.response?.data?.error || 'Failed to update category search details');
        }
    };

    const updateCollectionSeo = (field, value) => {
        setCollectionForm(prev => ({
            ...prev,
            seo: {
                ...(prev.seo || {}),
                [field]: value
            }
        }));
    };

    const receiveCollection = response => {
        if (!response) return;
        const { data } = response;
        setCollectionAi({ loading: false, error: '', suggestion: data.data || null, meta: data.meta || null });
        toast.success(data.fallback ? 'Basic collection suggestion generated.' : 'AI collection suggestion ready.');
    };
    const generateCollectionAi = async () => {
        if (!collectionForm.title.trim() && collectionMembers.length === 0) { toast.error('Add a collection title or select products before using AI.'); return; }
        setCollectionAi({ loading: true, error: '', suggestion: null });
        const body = { title: collectionForm.title, description: collectionForm.description, seo: collectionForm.seo, productIds: collectionMembers, entityId: editingCollectionId || 'new-collection' };
        receiveCollection(await operation.run(options => API.post('/admin/collections/ai/suggest', body, options)));
        setCollectionAi(previous => ({ ...previous, loading: false }));
    };

    const applyCollectionAi = (fields = []) => {
        const suggestion = collectionAi.suggestion;
        if (!suggestion || !operation.canApply()) { toast.error('Inputs changed. Generate again before applying.'); return; }
        const shouldApply = (field) => fields.includes(field) || fields.includes('all');

        const prev = collectionForm;
        const next = {
            ...prev,
            ...(shouldApply('name') ? { title: suggestion.name || prev.title } : {}),
            ...(shouldApply('description') ? { description: suggestion.description || prev.description } : {}),
            ...(shouldApply('slug') ? { slug: suggestion.slug || prev.slug } : {}),
            seo: {
                ...(prev.seo || {}),
                ...(shouldApply('seo') || shouldApply('seoTitle') ? { title: suggestion.seoTitle || prev.seo?.title || '' } : {}),
                ...(shouldApply('seo') || shouldApply('seoDescription') ? { description: suggestion.seoDescription || prev.seo?.description || '' } : {})
            }
        };
        undo.record(collectionForm, next);
        operation.rebase({ ...operationInput, form: next });
        setCollectionForm(next);
        toast.success('Suggestion applied. Review before saving.');
    };

    return (
        <div className="mx-auto max-w-[1500px] space-y-6 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
            <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
                            <Sparkles size={14} />
                            Catalog workspace
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Catalog</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            Edit products, organize collections, and manage category presentation.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <PageRefreshButton
                            onClick={loadData}
                            loading={loading && (products.length > 0 || collections.length > 0)}
                            label="Refresh catalog tools"
                        />
                        <button
                            onClick={exportCsv}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
                            title="Export summary fields. Images, descriptions and variants are not included."
                        >
                            <Download size={17} />
                            Export summary
                        </button>
                        <label
                            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow"
                            title="Preview a CSV before creating or updating products"
                        >
                            <Upload size={17} />
                            Import CSV
                            <input type="file" accept=".csv" disabled={importBusy} onChange={importCsv} className="sr-only" />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 border-t border-slate-100 sm:grid-cols-4">
                    {[
                        { label: 'Products', value: productStats.total, helper: 'in catalog' },
                        { label: 'Published', value: productStats.published, helper: 'published status' },
                        { label: 'Low-stock variants', value: productStats.lowStockVariants, helper: `${productStats.lowStockProducts} products` },
                        { label: 'Collections', value: collections.length, helper: 'storefront groups' }
                    ].map((item, index) => (
                        <div key={item.label} className={`p-4 sm:p-5 ${index % 2 === 0 ? 'border-r border-slate-100' : ''} ${index < 2 ? 'border-b border-slate-100 sm:border-b-0' : ''} sm:border-r sm:last:border-r-0`}>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</div>
                            <div className="mt-1 flex items-end gap-2">
                                <div className="text-2xl font-bold text-slate-950">{item.value}</div>
                                <div className="pb-1 text-xs text-slate-500">{item.helper}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </header>

            {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError} <button onClick={loadData} className="font-bold underline">Retry</button></div>}
            <nav aria-label="Catalog sections" className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                {[['products', 'Products & bulk edit'], ['collections', 'Collections'], ['categories', 'Categories'], ['transfer', 'Import / Export'], ['activity', 'Activity']].map(([id, label]) => <button key={id} onClick={() => { setActiveView(id); if (id === 'activity') loadActivity(); }} aria-current={activeView === id ? 'page' : undefined} className={`whitespace-nowrap rounded-lg px-4 py-3 text-sm font-bold ${activeView === id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>)}
            </nav>
            {activeView === 'activity' && <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Bulk edit history</h2><p className="mt-2 text-sm text-slate-500">Last 50 operations. Undo is available only while every affected product remains unchanged.</p>{activityError && <p role="alert">{activityError} <button onClick={loadActivity}>Retry</button></p>}{!activity.length && !activityError && <p className="py-8 text-slate-500">No bulk edits recorded yet.</p>}{activity.map(item => <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 border-b py-4"><div><p className="font-bold">{item.count} products updated</p><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.actor}</p><p className="text-sm text-slate-600">{Object.keys(item.updates || {}).join(', ')}</p></div><button disabled={Boolean(item.undoneAt)} onClick={() => undoOperation(item._id)} className="rounded-lg border px-4 py-2 disabled:opacity-40">{item.undoneAt ? 'Undone' : 'Undo'}</button></div>)}</section>}
            {activeView === 'transfer' && <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h2 className="font-bold">Export product summary</h2><label className="mt-3 block text-sm">Export scope <select aria-label="Export scope" value={exportScope} onChange={e => setExportScope(e.target.value)} className="ml-2 rounded border p-2"><option value="all">All products</option><option value="filtered">Current filters</option><option value="selected">Selected products ({selected.length})</option></select></label><button onClick={exportCsv} className="mt-3 rounded-lg border bg-white px-4 py-2 font-bold">Download summary CSV</button></div>
                <h2 className="text-xl font-bold">Import with confidence</h2>
                <p className="text-sm text-slate-600">Upload up to 200 rows. Validate first, then apply the entire batch. If a row fails, nothing is saved. Summary exports preserve neither images nor variant details and are not full backups.</p>
                <label className="block text-sm font-bold">Import mode<select disabled={importBusy} value={importMode} onChange={event => { setImportMode(event.target.value); setImportResult(null); }} className="ml-3 rounded-lg border p-2"><option value="create">Create new products</option><option value="update">Update existing products by ID</option></select></label>
                <p className="text-sm text-slate-500">Updates preserve variants, stock, images, descriptions and URLs. New Published rows will be published. Existing publication schedules are preserved. Review status before applying.</p>
                <label className="inline-flex cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white">Choose CSV<input aria-label="Choose catalog CSV" type="file" accept=".csv" disabled={importBusy} onChange={importCsv} className="sr-only" /></label>
                {importDraft && <div className="rounded-xl bg-slate-50 p-4 space-y-3"><p className="font-semibold">{importDraft.name} · {importDraft.rows.length} rows</p><div className="max-h-60 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Row</th><th>Product</th><th>Status</th><th>Price</th></tr></thead><tbody>{importDraft.rows.map((row, index) => <tr key={index}><td>{index + 2}</td><td>{row.title || row.id}</td><td>{row.status || (importMode === 'create' ? 'Draft' : 'Unchanged')}</td><td>{row.sellingPrice ?? 'Unchanged'}</td></tr>)}</tbody></table></div><button disabled={importBusy} onClick={() => runImport(true)} className="rounded-lg border bg-white px-4 py-2 font-bold">{importBusy ? 'Processing…' : 'Validate rows'}</button>{importResult?.preview && <button disabled={importBusy} onClick={() => runImport(false)} className="ml-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white">Apply {importDraft.rows.length} {importMode === 'update' ? 'updates' : 'new products'}</button>}</div>}
                {importResult && <div role="status" className={`rounded-xl p-4 text-sm ${importResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{importResult.error || (importResult.preview ? 'Validation passed. Review the rows above and apply when ready.' : `${importResult.count} products saved.`)}{importResult.errors?.map(item => <p key={item.row}>Row {item.row}: {item.error}</p>)}{importResult.errors?.length > 0 && <button onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(importResult.errors, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'catalog-import-errors.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="mt-2 font-bold underline">Download row errors</button>}</div>}
            </section>}

            <div className={`${['products', 'collections'].includes(activeView) ? 'grid' : 'hidden'} grid-cols-1 gap-6 ${activeView === 'products' ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
                <section id="products" hidden={activeView !== 'products'} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Package size={19} className="text-indigo-600" />
                                    <h2 className="text-lg font-bold text-slate-950">Products</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Search and filter first, then select only the products you want to change.
                                </p>
                            </div>
                            <div className="text-sm font-semibold text-slate-500">
                                Showing <span className="text-slate-900">{filteredProducts.length}</span> of {productTotal} matching
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <label className="relative block sm:col-span-2">
                                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchQuery}
                                    onChange={event => { setPage(1); setSearchQuery(event.target.value); }}
                                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                                    aria-label="Search products" placeholder="Search title, SKU or tags..."
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Clear product search"
                                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <X size={15} />
                                    </button>
                                )}
                            </label>
                            <select
                                aria-label="Category" value={categoryFilter}
                                onChange={event => { setPage(1); setCategoryFilter(event.target.value); }}
                                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                            >
                                <option value="">All categories</option>
                                {categories.map(category => (
                                    <option key={category.name} value={category.name}>{category.name}</option>
                                ))}
                            </select>
                            <select
                                aria-label="Product status" value={statusFilter}
                                onChange={event => { setPage(1); setStatusFilter(event.target.value); }}
                                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                            >
                                <option value="">Any status</option>
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Archived</option>
                            </select>
                            <select
                                aria-label="Stock level" value={stockFilter}
                                onChange={event => { setPage(1); setStockFilter(event.target.value); }}
                                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                            >
                                <option value="">Any stock</option>
                                <option value="low">Low stock</option>
                                <option value="in">In stock</option>
                                <option value="out">Out of stock</option>
                            </select><select aria-label="Storefront visibility filter" value={visibilityFilter} onChange={event => { setPage(1); setVisibilityFilter(event.target.value); }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"><option value="">Any visibility</option><option value="true">Enabled</option><option value="false">Hidden</option></select>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { const name = window.prompt('Name this filter view'); if (name?.trim()) setSavedViews(previous => [...previous, { name: name.trim(), searchQuery, categoryFilter, statusFilter, stockFilter, visibilityFilter, sortOrder }]); }} className="rounded-lg border px-3 py-2 text-xs font-bold">Save view for this session</button>{savedViews.map((view, index) => <button key={index} onClick={() => { setPage(1); setSearchQuery(view.searchQuery); setCategoryFilter(view.categoryFilter); setStatusFilter(view.statusFilter); setStockFilter(view.stockFilter); setVisibilityFilter(view.visibilityFilter || ''); setSortOrder(view.sortOrder); }} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">{view.name}</button>)}</div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleAllVisible}
                                    disabled={filteredProducts.length === 0}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <CheckSquare2 size={16} />
                                    {allVisibleSelected ? 'Unselect page' : 'Select page'}
                                </button>
                                {selectedCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                    >
                                        <X size={15} />
                                        Clear selection
                                    </button>
                                )}
                                {hasProductFilters && (
                                    <button
                                        type="button"
                                        onClick={resetProductFilters}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50"
                                    >
                                        <RefreshCcw size={15} />
                                        Reset filters
                                    </button>
                                )}
                            </div>
                            <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                                {selectedCount} selected
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 text-sm"><label>Sort <select aria-label="Sort products" value={sortOrder} onChange={e => { setPage(1); setSortOrder(e.target.value); }} className="rounded border p-2"><option value="title">Title A–Z</option><option value="price">Price: low first</option><option value="stock">Stock: low first</option></select></label><div className="flex items-center gap-3"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(productTotal / 50))}</span><button disabled={page * 50 >= productTotal} onClick={() => setPage(p => p + 1)}>Next</button></div></div>
                    <div className="max-h-[760px] overflow-auto">
                        {loading && products.length > 0 && (
                            <div className="sticky top-0 z-10 border-b border-indigo-100 bg-indigo-50/95 px-5 py-2 text-sm font-semibold text-indigo-700 backdrop-blur">
                                Refreshing your catalog…
                            </div>
                        )}

                        {loading && products.length === 0 && !hasProductFilters ? (
                            <div className="grid gap-3 p-5">
                                {[1, 2, 3, 4, 5].map(item => (
                                    <div key={item} className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-100 p-4">
                                        <div className="h-5 w-5 rounded bg-slate-200" />
                                        <div className="h-14 w-14 rounded-xl bg-slate-200" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-1/3 rounded bg-slate-200" />
                                            <div className="h-3 w-1/2 rounded bg-slate-100" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.length === 0 && !hasProductFilters ? (
                            <div className="px-6 py-16 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <Package size={24} />
                                </div>
                                <h3 className="mt-4 font-bold text-slate-900">{loadError ? 'Products unavailable' : 'No products yet'}</h3>
                                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                                    Add products to your catalog before using bulk actions or creating product collections.
                                </p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <Search size={24} />
                                </div>
                                <h3 className="mt-4 font-bold text-slate-900">No matching products</h3>
                                <p className="mt-1 text-sm text-slate-500">Try another search or clear one of your filters.</p>
                                <button
                                    type="button"
                                    onClick={resetProductFilters}
                                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pagedProducts.map(product => {
                                    const productId = String(product._id);
                                    const totalStock = product.totalStock ?? product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) ?? 0;
                                    const lowStockCount = lowStockVariantCount(product);
                                    const lowStock = lowStockCount > 0;
                                    const isSelected = selected.includes(productId);
                                    const status = String(product.status || 'Draft');

                                    return (
                                        <label
                                            key={product._id}
                                            className={`group flex cursor-pointer items-center gap-4 px-4 py-4 transition sm:px-5 ${isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleProduct(productId)}
                                                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                                                {(product.coverMediaId || product.images?.[0]) ? (
                                                    <img src={product.coverMediaId || product.images[0]} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-slate-300">
                                                        <ImageIcon size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="truncate font-bold text-slate-900">{product.title}</div><a href={`/dashboard/products/edit/${product._id}`} onClick={event => { if (collectionDirty && !window.confirm('Leave with unsaved collection changes?')) event.preventDefault(); event.stopPropagation(); }} className="text-xs font-semibold text-indigo-600 underline">Edit product</a>
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                        status.toLowerCase() === 'published'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : status.toLowerCase() === 'archived'
                                                                ? 'bg-slate-100 text-slate-500'
                                                                : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                    <span>{product.category || 'General'}</span><span>Price {Number(product.pricing?.sellingPrice || 0).toLocaleString()}</span><span>{product.isActive === false ? 'Hidden' : 'Enabled'}</span><span>{(product.tags || []).join(', ')}</span>
                                                    <span className="hidden text-slate-300 sm:inline">•</span>
                                                    <span className={lowStock ? 'font-semibold text-amber-700' : ''}>Stock {totalStock}</span><span>{(product.skus || []).filter(Boolean).join(', ')}</span>
                                                    {product.pricing?.discount > 0 && (
                                                        <>
                                                            <span className="hidden text-slate-300 sm:inline">•</span>
                                                            <span>{product.pricing.discount}% discount</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {lowStock && (
                                                <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 sm:inline-flex">
                                                    <AlertTriangle size={13} />
                                                    {lowStockCount} low-stock variant{lowStockCount === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <aside className={activeView === 'collections' ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]' : 'space-y-6 xl:self-start'}>
                    <section id="bulk-editor" hidden={activeView !== 'products'} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 font-bold text-slate-950">
                                    <SlidersHorizontal size={18} className="text-indigo-600" />
                                    Bulk edit
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-500">Choose fields for up to 500 products. Review values before applying.</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedCount ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                {selectedCount}
                            </span>
                        </div>

                        {selectedCount === 0 && (
                            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                                Select one or more products from the list to activate bulk changes.{' '}
                                <a href="#products" className="font-semibold text-indigo-700 underline underline-offset-2">Choose products</a>
                            </div>
                        )}
                        {selectedCount > visibleSelectedCount && (
                            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                {selectedCount - visibleSelectedCount} selected product{selectedCount - visibleSelectedCount === 1 ? ' is' : 's are'} outside this page or hidden by your filters and will still be updated.
                            </p>
                        )}

                        <div className="mt-4 space-y-3">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold text-slate-600">Move to category</span>
                                <input
                                    value={bulk.category}
                                    onChange={e => setBulk(prev => ({ ...prev, category: e.target.value }))}
                                    list="catalog-bulk-categories"
                                    className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                    placeholder="Leave unchanged"
                                />
                                <datalist id="catalog-bulk-categories">
                                    {categories.map(category => <option key={category.name} value={category.name} />)}
                                </datalist>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold text-slate-600">Status</span>
                                <select
                                    value={bulk.status}
                                    onChange={e => setBulk(prev => ({ ...prev, status: e.target.value }))}
                                    className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                >
                                    <option value="">Keep current status</option>
                                    <option>Draft</option>
                                    <option>Published</option>
                                    <option>Archived</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold text-slate-600">Storefront visibility</span>
                                <select
                                    value={bulk.visibility}
                                    onChange={e => setBulk(prev => ({ ...prev, visibility: e.target.value }))}
                                    className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                >
                                    <option value="">Keep current visibility</option>
                                    <option value="show">Enabled</option>
                                    <option value="hide">Hidden</option>
                                </select>
                                <span className="mt-1 block text-xs text-slate-500">Products also need Published status and must have reached any scheduled publication time.</span>
                            </label>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                <p className="text-xs font-bold text-slate-700">Product tags</p>
                                <div className="mt-2 grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[110px_minmax(0,1fr)]">
                                    <select
                                        value={bulk.tagsMode}
                                        onChange={e => setBulk(prev => ({ ...prev, tagsMode: e.target.value }))}
                                        aria-label="Tag action"
                                        className="min-h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                    >
                                        <option value="add">Add</option>
                                        <option value="remove">Remove</option>
                                        <option value="replace">Replace</option>
                                        <option value="clear">Clear all</option>
                                    </select>
                                    <input
                                        value={bulk.tags}
                                        onChange={e => setBulk(prev => ({ ...prev, tags: e.target.value }))}
                                        disabled={bulk.tagsMode === 'clear'}
                                        aria-label="Tags separated by commas"
                                        placeholder={bulk.tagsMode === 'clear' ? 'All tags will be removed' : 'summer, featured'}
                                        className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-100"
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-slate-500">Separate tags with commas. Add or remove preserves other tags.</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                                <p className="text-xs font-bold text-slate-700">Pricing</p>
                                <p className="mt-1 text-xs text-slate-500">Percent changes preserve relative prices across selected products and their variant prices.</p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Selling price change %</span>
                                        <input
                                            type="number"
                                            min="-90"
                                            max="500"
                                            step="0.01"
                                            value={bulk.sellingPricePercent}
                                            onChange={e => setBulk(prev => ({ ...prev, sellingPricePercent: e.target.value }))}
                                            className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                            placeholder="e.g. 10 or -5"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Buying cost change %</span>
                                        <input
                                            type="number"
                                            min="-90"
                                            max="500"
                                            step="0.01"
                                            value={bulk.buyingPricePercent}
                                            onChange={e => setBulk(prev => ({ ...prev, buyingPricePercent: e.target.value }))}
                                            className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                            placeholder="e.g. 8 or -3"
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Discount %</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={bulk.discount}
                                        onChange={e => setBulk(prev => ({ ...prev, discount: e.target.value }))}
                                        className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                        placeholder="—"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Variant alert level</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={bulk.lowStockThreshold}
                                        onChange={e => setBulk(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                                        className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                        placeholder="—"
                                    />
                                </label>
                            </div>
                            <p className="text-xs leading-5 text-slate-500">Changing the alert level updates every variant of each selected product. It does not change stock quantities.</p>
                        </div>

                        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                            Stock quantity is managed from Inventory so every adjustment keeps its movement history and alerts.
                        </div>

                        <button
                            onClick={applyBulkUpdate}
                            disabled={selectedCount === 0 || selectedCount > 500 || !hasBulkChanges || bulkSaving}
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                            title="Apply the filled bulk fields to selected products"
                        >
                            {bulkSaving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                            {bulkSaving ? 'Applying changes…' : `Review and apply to ${selectedCount} product${selectedCount === 1 ? '' : 's'}`}
                        </button>
                        {hasBulkChanges && (
                            <button type="button" onClick={() => setBulk(emptyBulkForm)} disabled={bulkSaving} className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50">
                                Clear bulk fields
                            </button>
                        )}
                    </section>

                    <form hidden={activeView !== 'collections'} id="collection-editor" onSubmit={saveCollection} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 font-bold text-slate-950">
                                    <Layers size={18} className="text-indigo-600" />
                                    {editingCollectionId ? 'Edit collection' : 'Create collection'}
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {collectionMembers.length > 0
                                        ? `${collectionMembers.length} collection members will be included.`
                                        : 'Select products first, or build an empty collection and add items later.'}
                                </p>
                            </div>
                            {editingCollectionId && (
                                <button
                                    type="button"
                                    onClick={() => resetCollectionEditor()}
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                >
                                    <X size={15} />
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                                    <Wand2 size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-bold text-slate-900">AI collection assistant</div>
                                    <p className="mt-0.5 text-xs leading-5 text-slate-500">Generate a name, description, slug, and SEO copy from the title or selected products.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={generateCollectionAi}
                                disabled={operation.loading || !operation.access.allowed}
                                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Sparkles size={15} />
                                {collectionAi.loading ? 'Generating…' : 'Generate suggestion'}
                            </button>
                        </div>

                        <div className="mt-4">
                            <AiOperationStatus operation={operation} onRetry={async () => receiveCollection(await operation.retry())} onUndo={undo.undo} />
                        </div>
                        {collectionAi.suggestion && (
                            <div className="mt-4">
                                <AiFieldComparison
                                    current={{ name: collectionForm.title, slug: collectionForm.slug, description: collectionForm.description, seoTitle: collectionForm.seo?.title, seoDescription: collectionForm.seo?.description }}
                                    proposed={collectionAi.suggestion}
                                />
                            </div>
                        )}
                        {collectionAi.error && (
                            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                                {collectionAi.error}
                            </div>
                        )}
                        {collectionAi.suggestion && (
                            <div className="mt-4 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                                {collectionAi.meta?.fallback && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                                        Basic suggestions are shown because the AI response could not be used. Review every field before applying.
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm font-bold text-slate-900">{collectionAi.suggestion.name}</div>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{collectionAi.suggestion.description}</p>
                                </div>
                                <div className="rounded-lg bg-white p-2.5 text-xs text-slate-600">
                                    <div><span className="font-bold text-slate-800">SEO:</span> {collectionAi.suggestion.seoTitle}</div>
                                    <div className="mt-1">{collectionAi.suggestion.seoDescription}</div>
                                    {collectionAi.suggestion.keywords?.length > 0 && (
                                        <div className="mt-2 text-slate-500">
                                            Keywords: {collectionAi.suggestion.keywords.join(', ')}
                                            {' '}
                                            <button
                                                type="button"
                                                className="font-bold text-indigo-600 underline"
                                                onClick={() => navigator.clipboard.writeText(collectionAi.suggestion.keywords.join(', ')).then(() => toast.success('Keywords copied')).catch(() => toast.error('Could not copy keywords'))}
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => applyCollectionAi(['all'])} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">Apply all</button>
                                    <button type="button" onClick={() => applyCollectionAi(['description'])} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Description</button>
                                    <button type="button" onClick={() => applyCollectionAi(['seo'])} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">SEO only</button>
                                    <button type="button" onClick={() => applyCollectionAi(['slug'])} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Slug</button>
                                </div>
                            </div>
                        )}

                        <div className="mt-5 space-y-4">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">1</span>
                                    <span className="text-sm font-bold text-slate-800">Collection details</span>
                                </div>
                                <div className="space-y-3">
                                    <label className="block">
                                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Title</span>
                                        <input
                                            required
                                            value={collectionForm.title}
                                            onChange={e => setCollectionForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                            placeholder="Summer essentials"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 block text-xs font-bold text-slate-600">Slug</span>
                                        <input
                                            value={collectionForm.slug}
                                            onChange={e => setCollectionForm(prev => ({ ...prev, slug: e.target.value }))}
                                            className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                            placeholder="summer-essentials"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
                                            <span>Description</span>
                                            <span className="font-medium text-slate-400">{collectionForm.description.length} chars</span>
                                        </span>
                                        <textarea
                                            value={collectionForm.description}
                                            onChange={e => setCollectionForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                            rows={3}
                                            placeholder="Tell shoppers what this collection is about."
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">2</span>
                                    <span className="text-sm font-bold text-slate-800">Cover image</span>
                                </div>
                                {(collectionImagePreview && !removeCollectionImage) ? (
                                    <div className="group relative aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
                                        <img src={collectionImagePreview} alt="Collection cover preview" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                                        <button
                                            type="button"
                                            aria-label="Remove collection cover"
                                            onClick={() => {
                                                releaseCollectionPreview();
                                                setCollectionImageFile(null);
                                                setCollectionImagePreview('');
                                                setRemoveCollectionImage(Boolean(editingCollectionId && collectionForm.image));
                                            }}
                                            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow transition hover:bg-rose-50 hover:text-rose-700"
                                        >
                                            <X size={17} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                                        <ImageIcon size={30} />
                                    </div>
                                )}
                                <label className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                    <Upload size={16} />
                                    {collectionImagePreview ? 'Replace cover' : 'Upload cover'}
                                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCollectionImageChange} className="sr-only" />
                                </label>
                                <p className="mt-2 text-center text-[11px] text-slate-400">JPEG, PNG, or WebP up to 5 MB</p>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">3</span>
                                    <span className="text-sm font-bold text-slate-800">Visibility & search</span>
                                </div>
                                <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                                    <span>
                                        <span className="block">Visible on storefront</span>
                                        <span className="block text-[11px] font-normal text-slate-400">Customers can discover this collection.</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={collectionForm.isActive !== false}
                                        onChange={e => setCollectionForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </label>

                                <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
                                    <label className="block">
                                        <span className="mb-1.5 flex justify-between text-xs font-bold text-slate-600">
                                            <span>SEO title</span>
                                            <span className="font-medium text-slate-400">{(collectionForm.seo?.title || '').length}/70</span>
                                        </span>
                                        <input
                                            value={collectionForm.seo?.title || ''}
                                            onChange={e => updateCollectionSeo('title', e.target.value)}
                                            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                            maxLength={70}
                                            placeholder="Search result title"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1.5 flex justify-between text-xs font-bold text-slate-600">
                                            <span>SEO description</span>
                                            <span className="font-medium text-slate-400">{(collectionForm.seo?.description || '').length}/170</span>
                                        </span>
                                        <textarea
                                            value={collectionForm.seo?.description || ''}
                                            onChange={e => updateCollectionSeo('description', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                            maxLength={170}
                                            rows={2}
                                            placeholder="Short search-result description"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border p-4"><h3 className="font-bold">Collection members ({collectionMembers.length})</h3><p className="my-2 text-xs text-slate-500">Membership is independent of bulk selection. Select products on the Products tab, then add them here.</p><button type="button" onClick={() => setCollectionMembers(prev => [...new Set([...prev, ...selected])])} disabled={!selected.length} className="rounded border px-3 py-2 text-sm disabled:opacity-40">Add {selected.length} selected products</button><div className="max-h-56 overflow-auto">{collectionMembers.map(id => <div key={id} className="flex justify-between gap-3 border-b py-2 text-sm"><span>{productNames[id] || id}</span><button type="button" aria-label={`Remove member ${id}`} onClick={() => setCollectionMembers(prev => prev.filter(value => value !== id))}>Remove</button></div>)}</div></div>
                        <button
                            disabled={collectionSaving}
                            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Check size={17} />
                            {collectionSaving ? 'Saving…' : editingCollectionId ? 'Save collection' : `Create collection (${collectionMembers.length})`}
                        </button>
                    </form>

                    <section hidden={activeView !== 'collections'} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-950">Collections</div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{collections.length}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Edit a collection to load its products and settings back into the workspace.</p>
                        <div className="mt-4 max-h-[360px] space-y-2 overflow-auto pr-1">
                            {collections.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                                    No collections yet.
                                </div>
                            ) : collections.map(collection => (
                                <div key={collection._id} className="group flex items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-2.5 transition hover:border-slate-200 hover:bg-white hover:shadow-sm">
                                    <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200 text-slate-400">
                                        {collection.image ? (
                                            <img src={collection.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                        ) : (
                                            <ImageIcon size={18} />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="truncate text-sm font-bold text-slate-800">{collection.title}</div>
                                            {collection.isActive !== false && (
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Visible on storefront" />
                                            )}
                                        </div>
                                        <div className="truncate text-xs text-slate-500">{(collection.productIds || []).length} products · {collection.slug || 'No slug'}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => beginCollectionEdit(collection)}
                                        aria-label={`Edit ${collection.title}`}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteCollection(collection)}
                                        aria-label={`Delete ${collection.title}`}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>

            <section hidden={activeView !== 'categories'} id="category-covers" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-950">Category covers & details</h2>
                        <p className="mt-1 text-sm text-slate-500">Use strong covers and clean search metadata to make category browsing feel intentional.</p>
                    </div>
                    <input aria-label="Search categories" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} placeholder="Search categories" className="rounded-xl border px-3 py-2 text-sm" />
                </div>

                {categories.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Images size={24} />
                        </div>
                        <h3 className="mt-4 font-bold text-slate-900">No categories to customize</h3>
                        <p className="mt-1 text-sm text-slate-500">Categories appear here after products have a category.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {categories.filter(category => category.name.toLowerCase().includes(categorySearch.toLowerCase())).map(category => {
                            const key = String(category._id || category.name);
                            const savingCategory = categorySavingId === key;
                            return (
                                <article key={category.name} className="group min-w-0 bg-white p-4 transition hover:bg-slate-50/60">
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 text-slate-300">
                                        {category.image ? (
                                            <img
                                                src={category.image}
                                                alt={category.coverImage?.altText || `${category.name} category`}
                                                loading="lazy"
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center"><ImageIcon size={30} /></div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-3 pt-10 text-white">
                                            <div className="truncate text-sm font-bold">{category.name}</div>
                                            <div className="text-xs text-white/75">{category.productCount || 0} products</div>
                                        </div>
                                        {savingCategory && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-xs font-bold text-slate-700 backdrop-blur-sm">Saving…</div>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openCategoryPhotoPicker(category)}
                                            disabled={savingCategory}
                                            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Images size={15} />
                                            Product photo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openCategorySeoEditor(category)}
                                            disabled={savingCategory}
                                            aria-label={`Edit ${category.name} search details`}
                                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        {category.image && category._id && (
                                            <button
                                                type="button"
                                                onClick={() => removeCategoryCover(category)}
                                                disabled={savingCategory}
                                                aria-label={`Remove ${category.name} cover`}
                                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <label className="mt-2 inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-bold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                                        <Upload size={15} />
                                        {category.image ? 'Upload replacement' : 'Upload custom cover'}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            disabled={savingCategory}
                                            onChange={event => {
                                                const file = event.target.files?.[0];
                                                event.target.value = '';
                                                saveCategoryCover(category, file);
                                            }}
                                            className="sr-only"
                                        />
                                    </label>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {selectedCount > 0 && activeView === 'products' && (
                <div className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-slate-950/20 sm:p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 px-2 text-white">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                                <CheckSquare2 size={17} />
                            </div>
                            <div>
                                <div className="text-sm font-bold">{selectedCount} product{selectedCount === 1 ? '' : 's'} selected</div>
                                <div className="text-xs text-slate-400">Bulk edit or create a collection from this selection.</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="min-h-10 rounded-xl px-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                            >
                                Clear
                            </button>
                            <button type="button" onClick={() => document.getElementById('bulk-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="min-h-10 rounded-xl border border-slate-600 px-3 text-xs font-bold text-white">Bulk edit</button>
                            <button
                                type="button" onClick={() => { if (!editingCollectionId && !collectionDirty) setCollectionMembers([...selected]); setActiveView('collections'); }}
                                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-slate-950 transition hover:bg-slate-100"
                            >
                                {editingCollectionId ? 'Open collection editor' : 'Create collection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={Boolean(bulkPreview)} onClose={() => { if (!bulkSaving) setBulkPreview(null); }} title="Review bulk changes">
                <p className="text-sm text-slate-600">{bulkPreview?.rows.length} products will change. Stock quantities stay unchanged. If any product changes before you apply, you will need to review again.</p>
                <ul className="my-3 list-disc pl-5 text-sm">{bulkPreview?.changes.map(change => <li key={change}>{change}</li>)}</ul>
                <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Product / variant</th><th>Current price</th><th>New price</th><th>After discount</th></tr></thead><tbody>{bulkPreview?.rows.map(row => <tr key={row.id}><td className="py-3">{row.title}<div className="text-xs text-slate-500">{row.variants.map(variant => `${variant.sku || 'Default'}: ${variant.before} → ${variant.after}`).join('; ')}</div></td><td>{row.before.sellingPrice}</td><td>{row.after.sellingPrice}</td><td>{(row.after.sellingPrice * (1 - row.after.discount / 100)).toFixed(2)}{row.after.sellingPrice * (1 - row.after.discount / 100) < row.after.buyingPrice && <span className="block text-amber-700">Below cost</span>}</td></tr>)}</tbody></table></div>
                <button disabled={bulkSaving || !bulkPreview?.rows.length} onClick={commitBulk} className="mt-4 rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-50">{bulkSaving ? 'Applying…' : 'Apply changes'}</button>
            </Modal>
            <Modal
                isOpen={Boolean(categoryPhotoPicker.category)}
                onClose={() => {
                    if (!categorySavingId) {
                        setCategoryPhotoPicker({ category: null, images: [], loading: false, error: '' });
                    }
                }}
                title={`Choose a product photo${categoryPhotoPicker.category?.name ? ` for ${categoryPhotoPicker.category.name}` : ''}`}
            >
                <p className="mb-4 text-sm leading-6 text-slate-600">
                    Select an existing photo from a product in this category. The product image itself will not be changed or deleted.
                </p>
                {categoryPhotoPicker.loading ? (
                    <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-500">Loading product photos...</div>
                ) : categoryPhotoPicker.error ? (
                    <div className="space-y-3 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                        <p>{categoryPhotoPicker.error}</p>
                        <button
                            type="button"
                            onClick={() => openCategoryPhotoPicker(categoryPhotoPicker.category)}
                            className="min-h-11 rounded-lg bg-white px-4 font-bold text-rose-700 shadow-sm"
                        >
                            Retry
                        </button>
                    </div>
                ) : categoryPhotoPicker.images.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
                        No product photos are available in this category yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {categoryPhotoPicker.images.map(image => {
                            const isCurrent = image.url === categoryPhotoPicker.category?.image;
                            return (
                                <button
                                    type="button"
                                    key={`${image.productId}:${image.url}`}
                                    onClick={() => selectCategoryProductPhoto(image)}
                                    disabled={Boolean(categorySavingId)}
                                    aria-label={`Use photo from ${image.productTitle || 'product'}`}
                                    className={`overflow-hidden rounded-lg border bg-white text-left transition hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60 ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}
                                >
                                    <div className="aspect-square bg-slate-100">
                                        <img src={image.url} alt={image.altText || image.productTitle || ''} loading="lazy" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="truncate px-2 py-2 text-xs font-semibold text-slate-700">
                                        {isCurrent ? 'Current cover' : image.productTitle || 'Product photo'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </Modal>
            <Modal
                isOpen={Boolean(categorySeoEditor.category)}
                onClose={() => {
                    if (!categorySeoEditor.saving) {
                        setCategorySeoEditor({ category: null, name: '', title: '', description: '', saving: false });
                    }
                }}
                title={`Category details${categorySeoEditor.category?.name ? ` for ${categorySeoEditor.category.name}` : ''}`}
            >
                <form onSubmit={saveCategorySeo} className="space-y-4">
                    <p className="text-sm leading-6 text-slate-600">
                        Optional search title and description for this public category page. Leaving a field empty uses a truthful fallback from the category and store name.
                    </p>
                    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                        <span>Category name</span>
                        <input
                            required
                            aria-label="Category name"
                            value={categorySeoEditor.name}
                            onChange={event => setCategorySeoEditor(prev => ({ ...prev, name: event.target.value }))}
                            maxLength={80}
                            className="min-h-11 w-full rounded-lg border border-slate-200 px-3"
                        />
                        <span className="block text-xs font-normal text-slate-500">Renaming updates products in this category and keeps the old public URL as a permanent redirect.</span>
                    </label>
                    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                        <span>SEO title</span>
                        <input
                            value={categorySeoEditor.title}
                            onChange={event => setCategorySeoEditor(prev => ({ ...prev, title: event.target.value }))}
                            maxLength={70}
                            className="min-h-11 w-full rounded-lg border border-slate-200 px-3"
                            placeholder={categorySeoEditor.category?.name || 'Category title'}
                        />
                    </label>
                    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                        <span>SEO description</span>
                        <textarea
                            value={categorySeoEditor.description}
                            onChange={event => setCategorySeoEditor(prev => ({ ...prev, description: event.target.value }))}
                            maxLength={170}
                            rows={4}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            placeholder="Describe this category accurately for search results."
                        />
                    </label>
                    <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Cover image description</span><input value={categorySeoEditor.altText || ''} onChange={event => setCategorySeoEditor(previous => ({ ...previous, altText: event.target.value }))} maxLength={140} className="min-h-11 w-full rounded-lg border border-slate-200 px-3" placeholder="Describe the cover for screen readers" /></label>
                    <button disabled={categorySeoEditor.saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
                        <Check size={17} />
                        {categorySeoEditor.saving ? 'Saving...' : 'Save category details'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default CatalogTools;
