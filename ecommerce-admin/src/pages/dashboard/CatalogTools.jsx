import { useEffect, useState } from 'react';
import { Download, Upload, Layers, Wand2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

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
    const [selected, setSelected] = useState([]);
    const [bulk, setBulk] = useState({ category: '', status: '', stock: '', discount: '', lowStockThreshold: '' });
    const [collectionForm, setCollectionForm] = useState({ title: '', slug: '', description: '' });

    const selectedCount = selected.length;

    const loadData = async () => {
        try {
            const [productsRes, collectionsRes] = await Promise.all([
                API.get('/admin/products', { params: { limit: 200 } }),
                API.get('/admin/collections')
            ]);
            setProducts(productsRes.data.data || []);
            setCollections(collectionsRes.data.data || []);
        } catch {
            toast.error('Failed to load catalog tools');
        }
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
            toast.success('Products imported');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Import failed');
        } finally {
            event.target.value = '';
        }
    };

    const applyBulkUpdate = async () => {
        if (selectedCount === 0) {
            toast.error('Select products first');
            return;
        }

        const updates = {};
        if (bulk.category) updates.category = bulk.category;
        if (bulk.status) updates.status = bulk.status;
        if (bulk.stock !== '') updates.stock = Number(bulk.stock);
        if (bulk.lowStockThreshold !== '') updates.lowStockThreshold = Number(bulk.lowStockThreshold);
        if (bulk.discount !== '') updates.pricing = { discount: Number(bulk.discount) };

        try {
            await API.patch('/admin/products/bulk', { productIds: selected, updates });
            toast.success('Bulk update applied');
            setSelected([]);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Bulk update failed');
        }
    };

    const createCollection = async (e) => {
        e.preventDefault();
        try {
            await API.post('/admin/collections', {
                ...collectionForm,
                productIds: selected
            });
            toast.success('Collection created');
            setCollectionForm({ title: '', slug: '', description: '' });
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create collection');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Catalog Tools</h1>
                    <p className="text-sm text-slate-500 mt-1">Bulk import, export, edit products, and organize collections.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <Download size={17} />
                        Export CSV
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                        <Upload size={17} />
                        Import CSV
                        <input type="file" accept=".csv" onChange={importCsv} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="font-semibold text-slate-900">Products</div>
                        <div className="text-sm text-slate-500">{selectedCount} selected</div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[620px] overflow-auto">
                        {products.map(product => {
                            const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
                            return (
                                <label key={product._id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(product._id)}
                                        onChange={() => toggleProduct(product._id)}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                        {product.images?.[0] && <img src={product.images[0]} alt="" className="h-full w-full object-cover" />}
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
                        <input value={bulk.category} onChange={e => setBulk(prev => ({ ...prev, category: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Category" />
                        <select value={bulk.status} onChange={e => setBulk(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                            <option value="">Keep status</option>
                            <option>Draft</option>
                            <option>Published</option>
                            <option>Archived</option>
                        </select>
                        <input type="number" value={bulk.stock} onChange={e => setBulk(prev => ({ ...prev, stock: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Set stock" />
                        <input type="number" value={bulk.discount} onChange={e => setBulk(prev => ({ ...prev, discount: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Discount percent" />
                        <input type="number" value={bulk.lowStockThreshold} onChange={e => setBulk(prev => ({ ...prev, lowStockThreshold: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Low stock threshold" />
                        <button onClick={applyBulkUpdate} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                            Apply to {selectedCount} products
                        </button>
                    </section>

                    <form onSubmit={createCollection} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <Layers size={18} />
                            Collection
                        </div>
                        <input required value={collectionForm.title} onChange={e => setCollectionForm(prev => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Collection title" />
                        <input value={collectionForm.slug} onChange={e => setCollectionForm(prev => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Slug" />
                        <textarea value={collectionForm.description} onChange={e => setCollectionForm(prev => ({ ...prev, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" rows={3} placeholder="Description" />
                        <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                            Create from selected
                        </button>
                    </form>

                    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                        <div className="font-semibold text-slate-900">Collections</div>
                        {collections.map(collection => (
                            <div key={collection._id} className="rounded-lg bg-slate-50 px-3 py-2">
                                <div className="text-sm font-semibold text-slate-800">{collection.title}</div>
                                <div className="text-xs text-slate-500">{collection.slug}</div>
                            </div>
                        ))}
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default CatalogTools;
