import { useEffect, useState } from 'react';
import { Check, Download, Edit3, Image as ImageIcon, Images, Layers, Trash2, Upload, Wand2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import Modal from '../../components/ui/Modal.jsx';
import PageRefreshButton from '../../components/ui/PageRefreshButton.jsx';

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

const parseCsvLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            cells.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    cells.push(current);
    return cells;
};

const csvToProducts = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map(header => header.trim());
    return lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
        }, {});
    });
};

const CatalogTools = () => {
    const [products, setProducts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selected, setSelected] = useState([]);
    const [bulk, setBulk] = useState({ category: '', status: '', stock: '', discount: '', lowStockThreshold: '' });
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
    const [collectionAi, setCollectionAi] = useState({
        loading: false,
        error: '',
        suggestion: null
    });

    const selectedCount = selected.length;

    const loadData = async () => {
        setLoading(true);
        const [productsResult, collectionsResult, categoriesResult] = await Promise.allSettled([
            API.get('/admin/products', { params: { limit: 200 } }),
            API.get('/admin/collections'),
            API.get('/admin/categories')
        ]);

        const failedSections = [];
        if (productsResult.status === 'fulfilled') {
            const productsRes = productsResult.value;
            setProducts(productsRes.data.data || []);
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
            setCategories(categoriesRes.data.data || []);
        } else if (productsResult.status === 'fulfilled') {
            const productsPayload = productsResult.value.data || {};
            const fallbackCategories = productsPayload.categoryDetails
                || (productsPayload.categories || []).map(name => ({ name, slug: name, image: '', productCount: 0 }));
            setCategories(fallbackCategories);
            failedSections.push('category covers');
        } else {
            failedSections.push('category covers');
        }

        if (failedSections.length > 0) {
            toast.error(`Could not load ${failedSections.join(', ')}. Your other catalog data is still available.`);
        }
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(loadData, 0);
        return () => clearTimeout(timer);
    }, []);

    const toggleProduct = (id) => {
        setSelected(prev => (
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        ));
    };

    const exportCsv = () => {
        window.open(`${API.defaults.baseURL}/admin/products/export.csv`, '_blank');
    };

    const importCsv = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = csvToProducts(text);
            if (imported.length === 0) {
                toast.error('CSV file has no products');
                return;
            }
            await API.post('/admin/products/bulk-import', { products: imported });
            toast.success(`${imported.length} products imported. Review them before publishing changes.`);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Import failed');
        } finally {
            event.target.value = '';
        }
    };

    const applyBulkUpdate = async () => {
        if (selectedCount === 0) {
            toast.error('Select at least one product before applying a bulk update.');
            return;
        }

        const updates = {};
        if (bulk.category) updates.category = bulk.category;
        if (bulk.status) updates.status = bulk.status;
        if (bulk.lowStockThreshold !== '') updates.lowStockThreshold = Number(bulk.lowStockThreshold);
        if (bulk.discount !== '') updates.pricing = { discount: Number(bulk.discount) };

        try {
            await API.patch('/admin/products/bulk', { productIds: selected, updates });
            toast.success('Bulk update applied to selected products. Review your storefront if prices or stock changed.');
            setSelected([]);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Bulk update failed');
        }
    };

    const releaseCollectionPreview = () => {
        if (collectionImagePreview.startsWith('blob:')) URL.revokeObjectURL(collectionImagePreview);
    };

    const resetCollectionEditor = () => {
        releaseCollectionPreview();
        setCollectionForm(emptyCollectionForm);
        setEditingCollectionId('');
        setCollectionImageFile(null);
        setCollectionImagePreview('');
        setRemoveCollectionImage(false);
        setCollectionAi({ loading: false, error: '', suggestion: null });
        setSelected([]);
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
        releaseCollectionPreview();
        setEditingCollectionId(collection._id);
        setCollectionForm({
            title: collection.title || '',
            slug: collection.slug || '',
            description: collection.description || '',
            image: collection.image || '',
            isActive: collection.isActive !== false,
            seo: {
                title: collection.seo?.title || '',
                description: collection.seo?.description || ''
            }
        });
        setCollectionImageFile(null);
        setCollectionImagePreview(collection.image || '');
        setRemoveCollectionImage(false);
        setSelected((collection.productIds || []).map(item => String(item?._id || item)));
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
            payload.append('productIds', JSON.stringify(selected));
            if (collectionImageFile) payload.append('image', collectionImageFile);
            if (removeCollectionImage) payload.append('removeImage', 'true');

            if (editingCollectionId) {
                await API.patch(`/admin/collections/${editingCollectionId}`, payload);
                toast.success('Collection updated.');
            } else {
                await API.post('/admin/collections', payload);
                toast.success('Collection created from selected products.');
            }
            resetCollectionEditor();
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
            if (editingCollectionId === collection._id) resetCollectionEditor();
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

    const updateCollectionSeo = (field, value) => {
        setCollectionForm(prev => ({
            ...prev,
            seo: {
                ...(prev.seo || {}),
                [field]: value
            }
        }));
    };

    const generateCollectionAi = async () => {
        if (!collectionForm.title.trim() && selectedCount === 0) {
            toast.error('Add a collection title or select products before using AI.');
            return;
        }

        setCollectionAi({ loading: true, error: '', suggestion: null });

        try {
            const { data } = await API.post('/admin/collections/ai/suggest', {
                title: collectionForm.title,
                description: collectionForm.description,
                seo: collectionForm.seo,
                productIds: selected
            });

            if (!data.success) {
                const message = data.message || 'AI suggestions could not be generated right now.';
                setCollectionAi({ loading: false, error: message, suggestion: null });
                toast.error(message);
                return;
            }

            setCollectionAi({
                loading: false,
                error: '',
                suggestion: data.data || null
            });
            toast.success(data.fallback ? 'Basic collection suggestion generated.' : 'AI collection suggestion ready.');
        } catch (err) {
            const message = err.response?.data?.message || err.response?.data?.error || 'AI suggestions could not be generated right now.';
            setCollectionAi({ loading: false, error: message, suggestion: null });
            toast.error(message);
        }
    };

    const applyCollectionAi = (fields = []) => {
        const suggestion = collectionAi.suggestion;
        if (!suggestion) return;
        const shouldApply = (field) => fields.includes(field) || fields.includes('all');

        setCollectionForm(prev => ({
            ...prev,
            ...(shouldApply('name') ? { title: suggestion.name || prev.title } : {}),
            ...(shouldApply('description') ? { description: suggestion.description || prev.description } : {}),
            ...(shouldApply('slug') ? { slug: suggestion.slug || prev.slug } : {}),
            seo: {
                ...(prev.seo || {}),
                ...(shouldApply('seo') || shouldApply('seoTitle') ? { title: suggestion.seoTitle || prev.seo?.title || '' } : {}),
                ...(shouldApply('seo') || shouldApply('seoDescription') ? { description: suggestion.seoDescription || prev.seo?.description || '' } : {})
            }
        }));
        toast.success('Suggestion applied. Review before saving.');
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Catalog Tools</h1>
                    <p className="text-sm text-slate-500 mt-1">Use bulk tools when you need to update many products at once. Review selections before applying changes.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <PageRefreshButton
                        onClick={loadData}
                        loading={loading && (products.length > 0 || collections.length > 0)}
                        label="Refresh catalog tools"
                    />
                    <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" title="Download your current catalog as a CSV backup">
                        <Download size={17} />
                        Export CSV
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" title="Upload a CSV to create or update products in bulk">
                        <Upload size={17} />
                        Import CSV
                        <input type="file" accept=".csv" onChange={importCsv} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <div className="font-semibold text-slate-900">Products</div>
                            <p className="text-xs text-slate-500 mt-1">Select products first, then apply bulk edits or create a collection.</p>
                        </div>
                        <div className="text-sm text-slate-500">{selectedCount} selected</div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[620px] overflow-auto">
                        {loading && products.length > 0 && (
                            <div className="bg-indigo-50 px-5 py-2 text-sm text-indigo-700">
                                Refreshing catalog...
                            </div>
                        )}
                        {loading && products.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-500">Loading catalog products...</div>
                        ) : products.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-500">No products available for bulk actions yet. Add products before using catalog tools.</div>
                        ) : products.map(product => {
                            const totalStock = product.totalStock ?? product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) ?? 0;
                            return (
                                <label key={product._id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(product._id)}
                                        onChange={() => toggleProduct(product._id)}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                        {(product.coverMediaId || product.images?.[0]) && (
                                            <img src={product.coverMediaId || product.images[0]} alt="" className="h-full w-full object-cover" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-slate-900 truncate">{product.title}</div>
                                        <div className="text-xs text-slate-500">{product.status} / {product.category || 'General'} / Stock {totalStock}</div>
                                    </div>
                                    {totalStock <= (product.lowStockThreshold || 5) && (
                                        <span className="text-xs rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">Low stock</span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </section>

                <aside className="space-y-6">
                    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <Wand2 size={18} />
                            Bulk Edit
                        </div>
                        <p className="text-xs text-slate-500">Only filled fields are changed. Blank fields keep current product values.</p>
                        <input value={bulk.category} onChange={e => setBulk(prev => ({ ...prev, category: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Category" />
                        <select value={bulk.status} onChange={e => setBulk(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                            <option value="">Keep status</option>
                            <option>Draft</option>
                            <option>Published</option>
                            <option>Archived</option>
                        </select>
                        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                            Stock changes are handled from Inventory so every adjustment creates a movement record and low-stock alert state.
                        </div>
                        <input type="number" value={bulk.discount} onChange={e => setBulk(prev => ({ ...prev, discount: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Discount percent" />
                        <input type="number" value={bulk.lowStockThreshold} onChange={e => setBulk(prev => ({ ...prev, lowStockThreshold: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Low stock threshold" />
                        <button onClick={applyBulkUpdate} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" title="Apply the filled bulk fields to selected products">
                            Apply to {selectedCount} products
                        </button>
                    </section>

                    <form id="collection-editor" onSubmit={saveCollection} className="scroll-mt-24 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 font-semibold text-slate-900">
                                <Layers size={18} />
                                {editingCollectionId ? 'Edit collection' : 'New collection'}
                            </div>
                            {editingCollectionId && (
                                <button type="button" onClick={resetCollectionEditor} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
                                    <X size={15} />
                                    Cancel
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">Collections group selected products for storefront sections or navigation links.</p>
                        <button
                            type="button"
                            onClick={generateCollectionAi}
                            disabled={collectionAi.loading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Wand2 size={16} />
                            {collectionAi.loading ? 'Generating suggestion...' : 'Generate with AI'}
                        </button>
                        {collectionAi.error && (
                            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                                {collectionAi.error}
                            </div>
                        )}
                        {collectionAi.suggestion && (
                            <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">{collectionAi.suggestion.name}</div>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{collectionAi.suggestion.description}</p>
                                </div>
                                <div className="rounded-md bg-white p-2 text-xs text-slate-600">
                                    <div><span className="font-bold text-slate-800">SEO:</span> {collectionAi.suggestion.seoTitle}</div>
                                    <div className="mt-1">{collectionAi.suggestion.seoDescription}</div>
                                    {collectionAi.suggestion.keywords?.length > 0 && (
                                        <div className="mt-2 text-slate-500">Keywords: {collectionAi.suggestion.keywords.join(', ')}</div>
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
                        <input required value={collectionForm.title} onChange={e => setCollectionForm(prev => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Collection title" />
                        <input value={collectionForm.slug} onChange={e => setCollectionForm(prev => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Slug" />
                        <textarea value={collectionForm.description} onChange={e => setCollectionForm(prev => ({ ...prev, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" rows={3} placeholder="Description" />
                        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-800">Collection cover</div>
                                <p className="text-xs text-slate-500">JPEG, PNG, or WebP up to 5 MB.</p>
                            </div>
                            {(collectionImagePreview && !removeCollectionImage) ? (
                                <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
                                    <img src={collectionImagePreview} alt="Collection cover preview" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        aria-label="Remove collection cover"
                                        onClick={() => {
                                            releaseCollectionPreview();
                                            setCollectionImageFile(null);
                                            setCollectionImagePreview('');
                                            setRemoveCollectionImage(Boolean(editingCollectionId && collectionForm.image));
                                        }}
                                        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow"
                                    >
                                        <X size={17} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex aspect-[16/7] items-center justify-center rounded-lg bg-slate-50 text-slate-300">
                                    <ImageIcon size={30} />
                                </div>
                            )}
                            <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                <Upload size={16} />
                                {collectionImagePreview ? 'Replace cover' : 'Upload cover'}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCollectionImageChange} className="hidden" />
                            </label>
                        </div>
                        <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                            <span>Visible on storefront</span>
                            <input type="checkbox" checked={collectionForm.isActive !== false} onChange={e => setCollectionForm(prev => ({ ...prev, isActive: e.target.checked }))} className="h-5 w-5 rounded border-slate-300" />
                        </label>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-800">Collection SEO</div>
                                <p className="text-xs text-slate-500">Optional. These improve the public collection page title and search preview.</p>
                            </div>
                            <input value={collectionForm.seo?.title || ''} onChange={e => updateCollectionSeo('title', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" maxLength={70} placeholder="SEO title" />
                            <textarea value={collectionForm.seo?.description || ''} onChange={e => updateCollectionSeo('description', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" maxLength={170} rows={2} placeholder="SEO description" />
                        </div>
                        <button disabled={collectionSaving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                            <Check size={17} />
                            {collectionSaving ? 'Saving...' : editingCollectionId ? 'Save collection' : 'Create from selected'}
                        </button>
                    </form>

                    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                        <div className="font-semibold text-slate-900">Collections</div>
                        {collections.length === 0 ? (
                            <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No collections yet. Select products and create your first collection.</div>
                        ) : collections.map(collection => (
                            <div key={collection._id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5">
                                <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-200 text-slate-400">
                                    {collection.image ? (
                                        <img src={collection.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                                    ) : (
                                        <ImageIcon size={18} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-slate-800">{collection.title}</div>
                                    <div className="truncate text-xs text-slate-500">{collection.slug} / {(collection.productIds || []).length} products</div>
                                </div>
                                <button type="button" onClick={() => beginCollectionEdit(collection)} aria-label={`Edit ${collection.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-indigo-700">
                                    <Edit3 size={16} />
                                </button>
                                <button type="button" onClick={() => deleteCollection(collection)} aria-label={`Delete ${collection.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </section>
                </aside>
            </div>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5">
                    <h2 className="font-semibold text-slate-900">Category covers</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Add one cover per product category. The image appears in category sections and on the category page.</p>
                </div>
                {categories.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">Categories appear here after products have a category.</div>
                ) : (
                    <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-4">
                        {categories.map(category => {
                            const key = String(category._id || category.name);
                            const savingCategory = categorySavingId === key;
                            return (
                                <article key={category.name} className="min-w-0 p-4">
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 text-slate-300">
                                        {category.image ? (
                                            <img src={category.image} alt={category.coverImage?.altText || `${category.name} category`} loading="lazy" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center"><ImageIcon size={30} /></div>
                                        )}
                                        {savingCategory && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-bold text-slate-700">Saving...</div>
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-bold text-slate-900">{category.name}</h3>
                                            <p className="text-xs text-slate-500">{category.productCount || 0} products</p>
                                        </div>
                                        {category.image && category._id && (
                                            <button type="button" onClick={() => removeCategoryCover(category)} disabled={savingCategory} aria-label={`Remove ${category.name} cover`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openCategoryPhotoPicker(category)}
                                            disabled={savingCategory}
                                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Images size={16} />
                                            Choose product photo
                                        </button>
                                        <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                            <Upload size={16} />
                                            {category.image ? 'Upload another cover' : 'Upload cover'}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                disabled={savingCategory}
                                                onChange={event => {
                                                    const file = event.target.files?.[0];
                                                    event.target.value = '';
                                                    saveCategoryCover(category, file);
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

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
        </div>
    );
};

export default CatalogTools;
