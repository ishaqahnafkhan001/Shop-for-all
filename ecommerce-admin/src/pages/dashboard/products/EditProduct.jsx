import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Boxes, DollarSign, FileText, ListChecks, PackagePlus, Plus, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import {
    ProductFormSection,
    ReadinessChecklist,
    SellerHint
} from '../../../components/products/ProductFormUX.jsx';

/**
 * EditProduct
 * ─────────────────────────────────────────────────────────────────────────────
 * Variant operations map to 3 backend ops:
 *
 * 1. Stock edits & New Variants → saved on main submit (Op A: flat variants patch)
 * 2. Remove button              → immediate PATCH      (Op D: removeVariants)
 * 3. Add Option                 → its own action       (Op C: addAttributeOption)
 */
const EditProduct = () => {
    const navigate    = useNavigate();
    const { id }      = useParams();
    const { state }   = useLocation();

    const [loading,      setLoading]      = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Scalar + variant state ────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        title:          '',
        slug:           '',
        description:    '',
        category:       '',
        tags:           '',
        status:         'Published',
        lowStockThreshold: 5,
        seo:            { title: '', description: '' },
        pricing:        { buyingPrice: 0, sellingPrice: 0, discount: 0 },
        variants:       [],    // live variant list (reflects DB state + local additions)
        features:       [],
        specifications: [],
        comments:       []
    });

    // Track which variant stocks were changed (or newly added) by the user
    // variantId (or _tempId) → new stock value
    const [changedStocks, setChangedStocks] = useState({});

    // ── "Add option" panel state ──────────────────────────────────────────────
    const [showAddOption, setShowAddOption] = useState(false);
    const [addOptionForm, setAddOptionForm] = useState({
        name:         '',
        option:       '',
        defaultStock: 0
    });
    const [isAddingOption, setIsAddingOption] = useState(false);

    // ── "Create Custom Variant" panel state ───────────────────────────────────
    const [showAddVariant, setShowAddVariant] = useState(false);
    const [newVariantForm, setNewVariantForm] = useState({
        attributes: [{ name: '', value: '' }],
        stock: 0
    });

    // Derive the unique attribute names from current variants (for the dropdown)
    const existingAttrNames = [...new Set(
        formData.variants.flatMap(v => v.attributes.map(a => a.name))
    )];

    // ── Load product ──────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                let product = state?.product;
                if (!product) {
                    const res = await API.get(`/admin/products/${id}`);
                    product   = res.data.data || res.data;
                }
                setFormData({
                    title:          product.title          || '',
                    slug:           product.slug           || '',
                    description:    product.description    || '',
                    category:       product.category       || '',
                    tags:           (product.tags || []).join(', '),
                    status:         product.status         || (product.isActive ? 'Published' : 'Draft'),
                    lowStockThreshold: product.lowStockThreshold || 5,
                    seo:            product.seo || { title: '', description: '' },
                    pricing: {
                        buyingPrice:  product.pricing?.buyingPrice  || 0,
                        sellingPrice: product.pricing?.sellingPrice || 0,
                        discount:     product.pricing?.discount     || 0
                    },
                    variants:       product.variants       || [],
                    features:       product.features       || [],
                    specifications: product.specifications || [],
                    comments:       product.comments       || []
                });
            } catch {
                toast.error('Failed to load product');
                navigate('/dashboard/products');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, state, navigate]);

    // ── Scalar handlers ───────────────────────────────────────────────────────
    const handleChange  = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });
    const handlePricing = (e) => setFormData({
        ...formData,
        pricing: { ...formData.pricing, [e.target.id]: Number(e.target.value) }
    });

    // ── Stock handler ─────────────────────────────────────────────────────────
    const handleStockChange = (variantId, value) => {
        setChangedStocks(prev => ({ ...prev, [variantId]: Number(value) }));
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(variant => {
                const vid = variant._id?.toString() || variant._tempId;
                if (vid !== variantId) return variant;
                return {
                    ...variant,
                    stock: Number(value),
                    inventory: {
                        ...(variant.inventory || {}),
                        stock: Number(value)
                    }
                };
            })
        }));
    };

    const handleVariantFieldChange = (variantId, field, value) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(variant => {
                const vid = variant._id?.toString() || variant._tempId;
                if (vid !== variantId) return variant;

                if (['price', 'compareAtPrice', 'costPrice'].includes(field)) {
                    const pricing = { ...(variant.pricing || {}), [field]: value === '' ? undefined : Number(value) };
                    return {
                        ...variant,
                        pricing,
                        ...(field === 'price' && { priceOverride: pricing.price })
                    };
                }

                if (field === 'lowStockThreshold') {
                    return {
                        ...variant,
                        inventory: {
                            ...(variant.inventory || {}),
                            lowStockThreshold: Number(value)
                        }
                    };
                }

                if (['length', 'width', 'height'].includes(field)) {
                    return {
                        ...variant,
                        dimensions: {
                            unit: 'cm',
                            ...(variant.dimensions || {}),
                            [field]: value === '' ? undefined : Number(value)
                        }
                    };
                }

                if (field === 'taxable') {
                    return {
                        ...variant,
                        tax: {
                            taxable: Boolean(value),
                            ...(variant.tax || {})
                        }
                    };
                }

                if (field === 'status') {
                    return {
                        ...variant,
                        status: value,
                        isActive: value === 'active'
                    };
                }

                if (field === 'weight') {
                    return { ...variant, weight: value === '' ? undefined : Number(value) };
                }

                return { ...variant, [field]: value };
            })
        }));
        setChangedStocks(prev => ({
            ...prev,
            [variantId]: prev[variantId] ?? getDisplayStock(formData.variants.find(v => (v._id?.toString() || v._tempId) === variantId) || {})
        }));
    };

    const getDisplayStock = (variant) => {
        const vid = variant._id?.toString() || variant._tempId;
        return changedStocks[vid] !== undefined ? changedStocks[vid] : variant.stock;
    };

    // ── Remove variant ────────────────────────────────────────────────────────
    const handleRemoveVariant = async (variantId) => {
        if (formData.variants.length <= 1) {
            toast.error('A product must have at least one variant');
            return;
        }
        if (!window.confirm('Remove this variant?')) return;

        // If it's a locally added temporary variant, remove it immediately from UI
        if (variantId.startsWith('temp_')) {
            setFormData(prev => ({
                ...prev,
                variants: prev.variants.filter(v => v._tempId !== variantId)
            }));
            setChangedStocks(prev => {
                const cleaned = { ...prev };
                delete cleaned[variantId];
                return cleaned;
            });
            toast.success('Local variant removed');
            return;
        }

        // Otherwise, send the API patch to remove from DB
        try {
            await API.patch(`/admin/products/${id}`, { removeVariants: [variantId] });
            setFormData(prev => ({
                ...prev,
                variants: prev.variants.filter(v => v._id?.toString() !== variantId)
            }));
            setChangedStocks(prev => {
                const cleaned = { ...prev };
                delete cleaned[variantId];
                return cleaned;
            });
            toast.success('Variant removed');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove variant');
        }
    };

    // ── Add single option (Immediate API Call) ────────────────────────────────
    const handleAddOption = async () => {
        if (!addOptionForm.name.trim() || !addOptionForm.option.trim()) {
            toast.error('Attribute name and option value are required');
            return;
        }
        setIsAddingOption(true);
        try {
            const res = await API.patch(`/admin/products/${id}`, {
                addAttributeOption: {
                    name:         addOptionForm.name.trim().toLowerCase(),
                    option:       addOptionForm.option.trim().toLowerCase(),
                    defaultStock: Number(addOptionForm.defaultStock)
                }
            });
            const updated = res.data.data;
            setFormData(prev => ({ ...prev, variants: updated.variants || prev.variants }));
            setAddOptionForm({ name: '', option: '', defaultStock: 0 });
            setShowAddOption(false);
            toast.success(`Added "${addOptionForm.option}" option — new combinations created`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add option');
        } finally {
            setIsAddingOption(false);
        }
    };

    // ── Add Completely New Variant (Saved on Main Submit) ─────────────────────
    const handleNewVariantAttrChange = (index, field, value) => {
        const updated = [...newVariantForm.attributes];
        updated[index][field] = value;
        setNewVariantForm(prev => ({ ...prev, attributes: updated }));
    };

    const handleAddCustomVariant = () => {
        // Filter out empty attributes
        const validAttrs = newVariantForm.attributes.filter(a => a.name.trim() && a.value.trim());
        if (validAttrs.length === 0) {
            toast.error("Add at least one complete attribute (e.g., color: blue)");
            return;
        }

        const tempId = `temp_${Date.now()}`;
        const newVariant = {
            _tempId: tempId,
            attributes: validAttrs.map(a => ({
                name: a.name.trim().toLowerCase(),
                value: a.value.trim().toLowerCase()
            })),
            stock: Number(newVariantForm.stock),
            isActive: true
        };

        // Append to local variants array
        setFormData(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));

        // Mark as changed so it gets bundled into the update payload
        setChangedStocks(prev => ({ ...prev, [tempId]: newVariant.stock }));

        // Reset the form
        setNewVariantForm({ attributes: [{ name: '', value: '' }], stock: 0 });
        setShowAddVariant(false);
        toast.success("Variant added locally! Click 'Update Product' to save it.");
    };

    // ── KV handlers ───────────────────────────────────────────────────────────
    const handleKVChange = (type, index, field, value) => {
        const updated = [...formData[type]];
        updated[index][field] = value;
        setFormData({ ...formData, [type]: updated });
    };
    const addKV    = (type) => setFormData({ ...formData, [type]: [...formData[type], { title: '', value: '' }] });
    const removeKV = (type, index) => setFormData({ ...formData, [type]: formData[type].filter((_, i) => i !== index) });

    // ── Pricing display ───────────────────────────────────────────────────────
    const selling    = Number(formData.pricing.sellingPrice) || 0;
    const buying     = Number(formData.pricing.buyingPrice)  || 0;
    const discount   = Number(formData.pricing.discount)     || 0;
    const finalPrice = selling - (selling * discount / 100);
    const profit     = finalPrice - buying;
    const totalStock = formData.variants.reduce((sum, variant) => sum + Number(getDisplayStock(variant) || 0), 0);
    const readinessItems = [
        { label: 'Product title is clear', done: Boolean(formData.title.trim()), helper: 'Use the name customers search for.' },
        { label: 'Category is selected', done: Boolean(formData.category.trim()), helper: 'Categories help filters and sections work correctly.' },
        { label: 'Selling price is set', done: selling > 0, helper: 'A product needs a customer-facing price.' },
        { label: 'Stock is available', done: totalStock > 0, helper: 'Keep stock updated to avoid cancelled orders.' },
        { label: 'Description helps shoppers', done: formData.description.trim().length >= 20, helper: 'Explain material, use case, or key benefit.' },
        { label: 'Product is published', done: formData.status === 'Published', helper: 'Draft products stay hidden from shoppers.' }
    ];

    // ── Main submit (scalar + stock changes + new variants) ───────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const body = {
                title:          formData.title,
                ...(formData.slug && { slug: formData.slug }),
                description:    formData.description,
                category:       formData.category,
                tags:           formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                status:         formData.status,
                lowStockThreshold: Number(formData.lowStockThreshold || 5),
                seo:            formData.seo,
                pricing:        formData.pricing,
                features:       formData.features,
                specifications: formData.specifications,
                comments:       formData.comments
            };

            // Process modified stocks AND newly created local variants
            if (Object.keys(changedStocks).length > 0) {
                body.variants = formData.variants
                    .filter(v => {
                        const vid = v._id?.toString() || v._tempId;
                        return changedStocks[vid] !== undefined;
                    })
                    .map(v => {
                        const vid = v._id?.toString() || v._tempId;
                        const payload = {
                            attributes:    v.attributes,
                            stock:         changedStocks[vid] ?? v.stock,
                            priceOverride: v.pricing?.price ?? v.priceOverride,
                            pricing:       v.pricing,
                            inventory:     { ...(v.inventory || {}), stock: changedStocks[vid] ?? v.stock },
                            image:         v.image,
                            sku:           v.sku,
                            barcode:       v.barcode,
                            weight:        v.weight,
                            dimensions:    v.dimensions,
                            status:        v.status || (v.isActive === false ? 'draft' : 'active'),
                            tax:           v.tax,
                            isActive:      v.isActive !== undefined ? v.isActive : true
                        };
                        // Only attach _id if it's a pre-existing variant.
                        // Backend will create new ones if _id is missing.
                        if (v._id) {
                            payload._id = v._id;
                        }
                        return payload;
                    });
            }

            await API.patch(`/admin/products/${id}`, body);

            // Fetch the freshly updated product to sync real DB IDs
            const res = await API.get(`/admin/products/${id}`);
            const freshProduct = res.data.data || res.data;

            setFormData(prev => ({ ...prev, variants: freshProduct.variants || [] }));
            setChangedStocks({});

            toast.success(formData.status === 'Draft' ? 'Product saved as draft.' : 'Product updated on your store.');
            navigate('/dashboard/products');
        } catch (err) {
            // 1. Log the full error to your browser console for debugging
            console.error("FULL ERROR OBJECT:", err);
            console.error("BACKEND RESPONSE:", err.response?.data);

            // 2. Create a much more specific error message
            const errorMessage = err.response
                ? err.response.data?.error
                    || err.response.data?.message
                    || err.response.data?.details
                    || `Server Error: ${err.response.status}`
                : err.request
                    ? "Network error: Could not reach the server."
                    : err.message || "Update failed. Please try again.";

            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-10">
                <AdminLoadingState
                    title="Loading product"
                    description="We are opening the product details, variants, pricing, and stock."
                />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Edit Product</h1>
                    <p className="text-sm text-gray-500 mt-1">Update storefront details carefully. Pricing, status, and stock changes can affect live orders.</p>
                </div>
                <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600">
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">

                {/* ── BASIC ─────────────────────────────────────────────── */}
                <ProductFormSection
                    title="1. Product basics"
                    description="Keep the title, category, and description easy for shoppers to understand."
                    icon={PackagePlus}
                >
                    <SellerHint>Published products are visible to shoppers. Draft products stay hidden until you are ready.</SellerHint>
                    <Input id="title" label="Title" value={formData.title} onChange={handleChange} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="slug" label="Product Slug" value={formData.slug} onChange={handleChange} />
                        <Input id="tags" label="Tags" value={formData.tags} onChange={handleChange} />
                        <Input id="lowStockThreshold" label="Low Stock Alert" type="number" value={formData.lowStockThreshold} onChange={handleChange} />
                    </div>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        rows={3}
                    />
                    <Input id="category" label="Category" value={formData.category} onChange={handleChange} />
                    <label className="block text-sm font-medium text-gray-700">
                        Status
                        <select
                            id="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            <option>Published</option>
                            <option>Draft</option>
                            <option>Archived</option>
                        </select>
                    </label>
                </ProductFormSection>

                <ProductFormSection
                    title="2. SEO details"
                    description="Optional search text for Google and shared links."
                    icon={Search}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            id="seoTitle"
                            label="SEO Title"
                            value={formData.seo.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, title: e.target.value } }))}
                        />
                        <Input
                            id="seoDescription"
                            label="SEO Description"
                            value={formData.seo.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, description: e.target.value } }))}
                        />
                    </div>
                </ProductFormSection>

                {/* ── PRICING ───────────────────────────────────────────── */}
                <ProductFormSection
                    title="3. Pricing"
                    description="Selling price and discount update the live storefront after saving."
                    icon={DollarSign}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="buyingPrice"  label="Buying"     type="number" value={buying}   onChange={handlePricing} />
                        <Input id="sellingPrice" label="Selling"    type="number" value={selling}  onChange={handlePricing} />
                        <Input id="discount"     label="Discount %" type="number" value={discount} onChange={handlePricing} />
                    </div>
                    <div className={`p-4 rounded-lg border text-sm space-y-1 ${profit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Final Price:</span>
                            <span className="font-bold text-indigo-600">৳ {Math.round(finalPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Profit:</span>
                            <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ৳ {profit.toFixed(2)} {profit < 0 && '(Loss!)'}
                            </span>
                        </div>
                    </div>
                </ProductFormSection>

                {/* ── VARIANTS ──────────────────────────────────────────── */}
                <ProductFormSection
                    title="4. Stock and product variants"
                    description="Variants are sellable options like size, color, storage, or style."
                    icon={Boxes}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-400 mt-0.5">Edit stock directly. Pending changes are saved only when you update the product.</p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                            {formData.variants.length} variants
                        </span>
                    </div>

                    {/* Variant table */}
                    <div className="border rounded-xl overflow-x-auto">
                        <table className="min-w-[1280px] w-full text-sm">
                            <thead className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="text-left px-4 py-2.5 font-medium">Combination</th>
                                <th className="text-left px-3 py-2.5 font-medium w-32">SKU</th>
                                <th className="text-right px-3 py-2.5 font-medium w-28">Price</th>
                                <th className="text-right px-3 py-2.5 font-medium w-28">Compare</th>
                                <th className="text-right px-3 py-2.5 font-medium w-28">Cost</th>
                                <th className="text-right px-3 py-2.5 font-medium w-24">Stock</th>
                                <th className="text-right px-3 py-2.5 font-medium w-24">Low</th>
                                <th className="text-left px-3 py-2.5 font-medium w-32">Barcode</th>
                                <th className="text-right px-3 py-2.5 font-medium w-24">Weight</th>
                                <th className="text-left px-3 py-2.5 font-medium w-36">Dimensions</th>
                                <th className="text-left px-3 py-2.5 font-medium w-44">Image URL</th>
                                <th className="text-left px-3 py-2.5 font-medium w-28">Status</th>
                                <th className="text-center px-3 py-2.5 font-medium w-20">Tax</th>
                                <th className="w-10" />
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {formData.variants.map((v) => {
                                const vid        = v._id?.toString() || v._tempId;
                                const isModified = changedStocks[vid] !== undefined;
                                const isNew      = !!v._tempId;

                                return (
                                    <tr key={vid} className={`hover:bg-gray-50/60 ${isNew ? 'bg-green-50/30' : ''}`}>
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {v.attributes?.map(a => (
                                                    <span key={a.name} className="text-gray-700">
                                                        <span className="text-gray-400 text-xs mr-0.5">{a.name}:</span>
                                                        <span className="font-medium">{a.value}</span>
                                                    </span>
                                                ))}
                                                {isNew && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase font-bold">New</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <input
                                                value={v.sku || ''}
                                                onChange={(e) => handleVariantFieldChange(vid, 'sku', e.target.value.toUpperCase())}
                                                placeholder="SKU"
                                                className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <input
                                                type="number" min={0}
                                                value={v.pricing?.price ?? v.priceOverride ?? ''}
                                                onChange={(e) => handleVariantFieldChange(vid, 'price', e.target.value)}
                                                placeholder={formData.pricing.sellingPrice}
                                                className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <input
                                                type="number" min={0}
                                                value={v.pricing?.compareAtPrice ?? ''}
                                                onChange={(e) => handleVariantFieldChange(vid, 'compareAtPrice', e.target.value)}
                                                placeholder="0"
                                                className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <input
                                                type="number" min={0}
                                                value={v.pricing?.costPrice ?? ''}
                                                onChange={(e) => handleVariantFieldChange(vid, 'costPrice', e.target.value)}
                                                placeholder={formData.pricing.buyingPrice}
                                                className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <input
                                                type="number" min={0}
                                                value={getDisplayStock(v)}
                                                onChange={(e) => handleStockChange(vid, e.target.value)}
                                                className={`w-20 text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors ${
                                                    isModified ? 'border-amber-300 bg-amber-50/60' : ''
                                                }`}
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <input
                                                type="number" min={0}
                                                value={v.inventory?.lowStockThreshold ?? formData.lowStockThreshold ?? 5}
                                                onChange={(e) => handleVariantFieldChange(vid, 'lowStockThreshold', e.target.value)}
                                                className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <input
                                                value={v.barcode || ''}
                                                onChange={(e) => handleVariantFieldChange(vid, 'barcode', e.target.value)}
                                                placeholder="Barcode"
                                                className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <input
                                                type="number" min={0}
                                                value={v.weight ?? ''}
                                                onChange={(e) => handleVariantFieldChange(vid, 'weight', e.target.value)}
                                                placeholder="kg"
                                                className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="grid grid-cols-3 gap-1">
                                                {['length', 'width', 'height'].map(field => (
                                                    <input
                                                        key={field}
                                                        type="number"
                                                        min={0}
                                                        value={v.dimensions?.[field] ?? ''}
                                                        onChange={(e) => handleVariantFieldChange(vid, field, e.target.value)}
                                                        placeholder={field[0].toUpperCase()}
                                                        className="w-full border rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <input
                                                value={v.image || ''}
                                                onChange={(e) => handleVariantFieldChange(vid, 'image', e.target.value)}
                                                placeholder="https://..."
                                                className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <select
                                                value={v.status || (v.isActive === false ? 'draft' : 'active')}
                                                onChange={(e) => handleVariantFieldChange(vid, 'status', e.target.value)}
                                                className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                                            >
                                                <option value="active">Active</option>
                                                <option value="draft">Draft</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <input
                                                type="checkbox"
                                                checked={v.tax?.taxable !== false}
                                                onChange={(e) => handleVariantFieldChange(vid, 'taxable', e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
                                            />
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveVariant(vid)}
                                                disabled={formData.variants.length <= 1}
                                                className="text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors"
                                                title="Remove this sellable option from the product"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {Object.keys(changedStocks).length > 0 && (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            {Object.keys(changedStocks).length} pending change(s) — saved when you click "Update Product"
                        </p>
                    )}

                    {/* ── Add option panel (Existing Dimension) ───────────────── */}
                    <div className="border rounded-xl overflow-hidden mt-4">
                        <button
                            type="button"
                            onClick={() => setShowAddOption(p => !p)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50/60 transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <Plus size={14} /> Add new option to existing attribute
                            </span>
                            {showAddOption ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showAddOption && (
                            <div className="px-4 pb-4 pt-1 border-t bg-gray-50/40 space-y-3">
                                <p className="text-xs text-gray-400">
                                    Add a value to an existing attribute, e.g. red under color. New combinations are created automatically.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Attribute</label>
                                        {existingAttrNames.length > 0 ? (
                                            <select
                                                value={addOptionForm.name}
                                                onChange={(e) => setAddOptionForm(p => ({ ...p, name: e.target.value }))}
                                                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                                            >
                                                <option value="">Select…</option>
                                                {existingAttrNames.map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                placeholder="e.g. color"
                                                value={addOptionForm.name}
                                                onChange={(e) => setAddOptionForm(p => ({ ...p, name: e.target.value }))}
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">New value</label>
                                        <input
                                            className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            placeholder="e.g. red"
                                            value={addOptionForm.option}
                                            onChange={(e) => setAddOptionForm(p => ({ ...p, option: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Default stock</label>
                                        <input
                                            type="number" min={0}
                                            className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            value={addOptionForm.defaultStock}
                                            onChange={(e) => setAddOptionForm(p => ({ ...p, defaultStock: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <Button type="button" onClick={handleAddOption} isLoading={isAddingOption} className="w-full sm:w-auto">
                                    Add Option
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ── Create Entirely New Custom Variant ──────────────────── */}
                    <div className="border rounded-xl overflow-hidden mt-3">
                        <button
                            type="button"
                            onClick={() => setShowAddVariant(p => !p)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50/60 transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <Plus size={14} /> Create entirely new custom variant
                            </span>
                            {showAddVariant ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showAddVariant && (
                            <div className="px-4 pb-4 pt-1 border-t bg-gray-50/40 space-y-3">
                                <p className="text-xs text-gray-400">
                                    Use this only for one-off combinations that should not generate every possible option.
                                </p>

                                {newVariantForm.attributes.map((attr, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            className="w-1/2 border rounded-lg px-2 py-1.5 text-sm"
                                            placeholder="Attribute (e.g. storage)"
                                            value={attr.name}
                                            onChange={(e) => handleNewVariantAttrChange(idx, 'name', e.target.value)}
                                        />
                                        <input
                                            className="w-1/2 border rounded-lg px-2 py-1.5 text-sm"
                                            placeholder="Value (e.g. 256GB)"
                                            value={attr.value}
                                            onChange={(e) => handleNewVariantAttrChange(idx, 'value', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setNewVariantForm(prev => ({...prev, attributes: prev.attributes.filter((_, i) => i !== idx)}))}
                                            disabled={newVariantForm.attributes.length === 1}
                                            className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setNewVariantForm(p => ({...p, attributes: [...p.attributes, {name:'', value:''}]}))}
                                    className="text-xs text-indigo-600 font-medium flex items-center gap-1"
                                >
                                    <Plus size={12} /> Add another attribute to this variant
                                </button>

                                <div className="pt-2 border-t">
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Initial Stock</label>
                                    <input
                                        type="number" min={0}
                                        className="w-32 border rounded-lg px-2 py-1.5 text-sm"
                                        value={newVariantForm.stock}
                                        onChange={(e) => setNewVariantForm(p => ({ ...p, stock: e.target.value }))}
                                    />
                                </div>

                                <Button type="button" onClick={handleAddCustomVariant} className="w-full sm:w-auto mt-2 bg-emerald-600 hover:bg-emerald-700">
                                    Add Variant to List
                                </Button>
                            </div>
                        )}
                    </div>

                </ProductFormSection>

                {/* ── FEATURES / SPECS / COMMENTS ───────────────────────── */}
                {['features', 'specifications', 'comments'].map((type, index) => (
                    <ProductFormSection
                        key={type}
                        title={`${5 + index}. ${type === 'features' ? 'Selling points' : type === 'specifications' ? 'Specifications' : 'Extra notes'}`}
                        description={type === 'features' ? 'Short benefits shown on the product page.' : type === 'specifications' ? 'Technical details like material, size, model, or warranty.' : 'Optional extra notes for shoppers.'}
                        icon={type === 'features' ? ListChecks : type === 'specifications' ? FileText : Search}
                        actions={(
                            <button
                                type="button" onClick={() => addKV(type)}
                                className="text-indigo-600 text-sm flex items-center gap-1 hover:text-indigo-700"
                            >
                                <Plus size={14} /> Add
                            </button>
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="font-semibold capitalize text-gray-700">{type}</h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    {type === 'features' ? 'Short selling points shown on the product page.' : type === 'specifications' ? 'Technical details like material, size, model, or warranty.' : 'Optional extra notes for shoppers.'}
                                </p>
                            </div>
                        </div>
                        {formData[type].map((item, i) => (
                            <div key={i} className="grid grid-cols-2 gap-2 relative pr-6">
                                <input
                                    className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    placeholder="Title"
                                    value={item.title}
                                    onChange={(e) => handleKVChange(type, i, 'title', e.target.value)}
                                />
                                <input
                                    className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    placeholder="Value"
                                    value={item.value}
                                    onChange={(e) => handleKVChange(type, i, 'value', e.target.value)}
                                />
                                <button
                                    type="button" onClick={() => removeKV(type, i)}
                                    className="absolute right-0 top-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {formData[type].length === 0 && (
                            <p className="text-xs text-gray-400">Nothing added yet. Add details if they help shoppers decide.</p>
                        )}
                    </ProductFormSection>
                ))}

                <Button type="submit" isLoading={isSubmitting}>
                    Update Product
                </Button>
                </div>

                <div className="space-y-4">
                    <ReadinessChecklist items={readinessItems} title="Product health" />
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">
                        <p className="font-black text-slate-950">Seller note</p>
                        <p className="mt-2">
                            Changes to price, stock, variants, and status affect the live storefront after you click Update Product.
                        </p>
                    </div>
                </div>

            </form>
        </div>
    );
};

export default EditProduct;
