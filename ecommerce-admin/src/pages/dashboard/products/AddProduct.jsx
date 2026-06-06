import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, X, Image as ImageIcon, Video, Sparkles, Loader2, Eye } from 'lucide-react';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

// ── Pure helpers (mirrors backend variantMatrix.js) ───────────────────────────

function cartesian(attrs) {
    if (!attrs.length) return [[]];
    const [first, ...rest] = attrs;
    const tail = cartesian(rest);
    return first.options.flatMap(opt =>
        tail.map(combo => [{ name: first.name, value: opt }, ...combo])
    );
}

function makePipeKey(combo) {
    return combo.map(a => a.value).join('|');
}

// ─────────────────────────────────────────────────────────────────────────────

const AddProduct = () => {
    const navigate   = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // ✨ AI Generation Loading State
    const [isGenerating, setIsGenerating] = useState(false);

    // Multi-media states
    const [imageFiles, setImageFiles] = useState([]);
    const [videoFiles, setVideoFiles] = useState([]);
    const [previewImageUrl, setPreviewImageUrl] = useState(null);

    // ── Scalar fields ─────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        title:          '',
        slug:           '',
        description:    '',
        category:       '',
        tags:           '',
        status:         'Published',
        lowStockThreshold: 5,
        seo:            { title: '', description: '' },
        pricing:        { buyingPrice: '', sellingPrice: '', discount: 0 },
        features:       [],
        specifications: [],
        comments:       []
    });

    // ── Variant matrix state ──────────────────────────────────────────────────
    const [attributes,    setAttributes]    = useState([{ name: '', options: [] }]);
    const [optionInputs,  setOptionInputs]  = useState(['']);
    const [defaultStock,  setDefaultStock]  = useState(0);
    const [stockOverrides, setStockOverrides] = useState({});
    const [variantDetails, setVariantDetails] = useState({});

    // ── Derived ───────────────────────────────────────────────────────────────
    const validAttrs = useMemo(
        () => attributes.filter(a => a.name.trim() && a.options.length > 0),
        [attributes]
    );
    const combinations = useMemo(
        () => (validAttrs.length > 0 ? cartesian(validAttrs) : []),
        [validAttrs]
    );

    const finalPrice = formData.pricing.sellingPrice - (formData.pricing.sellingPrice * formData.pricing.discount) / 100;
    const profit     = (finalPrice || 0) - (Number(formData.pricing.buyingPrice) || 0);

    // Live Image Preview Effect
    useEffect(() => {
        if (imageFiles.length > 0) {
            const url = URL.createObjectURL(imageFiles[0]);
            queueMicrotask(() => setPreviewImageUrl(url));
            return () => URL.revokeObjectURL(url); // cleanup
        } else {
            queueMicrotask(() => setPreviewImageUrl(null));
        }
    }, [imageFiles]);

    // ── AI Generator Handler ──────────────────────────────────────────────────
    const handleGenerateDescription = async () => {
        if (!formData.title) {
            toast.error("Please enter a product title first!");
            return;
        }

        setIsGenerating(true);
        try {
            const response = await API.post('/admin/generate-description', {
                title: formData.title,
                category: formData.category
            });

            if (response.data.success) {
                setFormData(prev => ({ ...prev, description: response.data.description }));
                toast.success("Description generated. Review it before publishing.");
            }
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to generate description.");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Attribute dimension handlers ──────────────────────────────────────────

    const setAttrName = (i, name) => {
        const updated = [...attributes];
        updated[i] = { ...updated[i], name: name.toLowerCase().trim() };
        setAttributes(updated);
    };

    const addAttribute = () => {
        setAttributes([...attributes, { name: '', options: [] }]);
        setOptionInputs([...optionInputs, '']);
    };

    const removeAttribute = (i) => {
        if (attributes.length === 1) return;
        setAttributes(attributes.filter((_, idx) => idx !== i));
        setOptionInputs(optionInputs.filter((_, idx) => idx !== i));
    };

    const commitOption = (attrIdx, raw) => {
        const val = raw.trim();
        if (!val) return;
        const updated = [...attributes];
        if (updated[attrIdx].options.some(option => option.toLowerCase() === val.toLowerCase())) {
            const inputs = [...optionInputs];
            inputs[attrIdx] = '';
            setOptionInputs(inputs);
            return;
        }
        updated[attrIdx] = { ...updated[attrIdx], options: [...updated[attrIdx].options, val] };
        setAttributes(updated);
        const inputs = [...optionInputs];
        inputs[attrIdx] = '';
        setOptionInputs(inputs);
    };

    const removeOption = (attrIdx, optVal) => {
        const updated = [...attributes];
        updated[attrIdx] = {
            ...updated[attrIdx],
            options: updated[attrIdx].options.filter(o => o !== optVal)
        };
        setAttributes(updated);
    };

    const handleOptionKeyDown = (e, attrIdx) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commitOption(attrIdx, optionInputs[attrIdx]);
        }
        if (e.key === 'Backspace' && optionInputs[attrIdx] === '') {
            const opts = attributes[attrIdx].options;
            if (opts.length > 0) removeOption(attrIdx, opts[opts.length - 1]);
        }
    };

    // ── Stock override handlers ───────────────────────────────────────────────

    const getStock = (combo) => {
        const key = makePipeKey(combo);
        return stockOverrides[key] !== undefined ? stockOverrides[key] : defaultStock;
    };

    const setStock = (combo, val) => {
        const key = makePipeKey(combo);
        setStockOverrides(prev => ({ ...prev, [key]: Number(val) }));
    };

    const getVariantField = (combo, field, fallback = '') => {
        const key = makePipeKey(combo);
        return variantDetails[key]?.[field] ?? fallback;
    };

    const setVariantField = (combo, field, value) => {
        const key = makePipeKey(combo);
        setVariantDetails(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [field]: value
            }
        }));
    };

    const handleDefaultStockChange = (val) => {
        const n = Number(val);
        setDefaultStock(n);
        setStockOverrides(prev => {
            const cleaned = { ...prev };
            for (const key of Object.keys(cleaned)) {
                if (cleaned[key] === n) delete cleaned[key];
            }
            return cleaned;
        });
        setVariantDetails(prev => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                next[key] = { ...next[key], stock: n };
            }
            return next;
        });
    };

    const setAllStock = (val) => {
        const n = Number(val);
        setDefaultStock(n);
        setStockOverrides({});
    };

    // ── Scalar handlers ───────────────────────────────────────────────────────

    const handleChange  = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });
    const handlePricing = (e) => setFormData({
        ...formData,
        pricing: { ...formData.pricing, [e.target.id]: Number(e.target.value) }
    });

    const handleKVChange = (type, index, field, value) => {
        const updated = [...formData[type]];
        updated[index][field] = value;
        setFormData({ ...formData, [type]: updated });
    };
    const addKV    = (type) => setFormData({ ...formData, [type]: [...formData[type], { title: '', value: '' }] });
    const removeKV = (type, index) => setFormData({ ...formData, [type]: formData[type].filter((_, i) => i !== index) });

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validAttrs.length === 0) {
            toast.error('Add at least one attribute with options (e.g. color: black, white)');
            return;
        }
        if (combinations.length === 0) {
            toast.error('No variant combinations generated. Check your attributes.');
            return;
        }

        const overrides = {};
        for (const combo of combinations) {
            const key = makePipeKey(combo);
            const stock = stockOverrides[key];
            const details = variantDetails[key] || {};
            const cleanNumber = (value) => value === '' || value === undefined || value === null ? undefined : Number(value);
            const override = {};
            const effectiveStock = stock !== undefined ? Number(stock) : Number(defaultStock);

            override.stock = effectiveStock;
            override.inventory = {
                stock: effectiveStock,
                lowStockThreshold: cleanNumber(details.lowStockThreshold) ?? Number(formData.lowStockThreshold || 5)
            };

            const price = cleanNumber(details.price);
            const compareAtPrice = cleanNumber(details.compareAtPrice);
            const costPrice = cleanNumber(details.costPrice);
            if (price !== undefined || compareAtPrice !== undefined || costPrice !== undefined) {
                override.pricing = {
                    ...(price !== undefined && { price }),
                    ...(compareAtPrice !== undefined && { compareAtPrice }),
                    ...(costPrice !== undefined && { costPrice })
                };
                if (price !== undefined) override.priceOverride = price;
            }
            if (details.sku) override.sku = details.sku;
            if (details.barcode) override.barcode = details.barcode;
            if (details.image) override.image = details.image;
            if (details.weight !== '' && details.weight !== undefined) override.weight = Number(details.weight);
            if (details.length || details.width || details.height) {
                override.dimensions = {
                    length: cleanNumber(details.length),
                    width: cleanNumber(details.width),
                    height: cleanNumber(details.height),
                    unit: 'cm'
                };
            }
            override.status = details.status || 'active';
            override.isActive = override.status === 'active';
            override.tax = { taxable: details.taxable !== false };
            overrides[key] = override;
        }

        setIsLoading(true);
        try {
            const data = new FormData();
            data.append('title',          formData.title);
            if (formData.slug) data.append('slug', formData.slug);
            data.append('description',    formData.description);
            data.append('category',       formData.category);
            data.append('tags',           formData.tags);
            data.append('status',         formData.status);
            data.append('lowStockThreshold', String(formData.lowStockThreshold || 5));
            data.append('seo',            JSON.stringify(formData.seo));
            data.append('pricing',        JSON.stringify(formData.pricing));
            data.append('variantMatrix',  JSON.stringify({
                attributes:   validAttrs,
                defaultStock: Number(defaultStock),
                overrides
            }));
            data.append('features',       JSON.stringify(formData.features));
            data.append('specifications', JSON.stringify(formData.specifications));
            data.append('comments',       JSON.stringify(formData.comments));

            imageFiles.forEach(file => data.append('images', file));
            videoFiles.forEach(file => data.append('videos', file));

            await API.post('/admin/products', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(formData.status === 'Draft' ? 'Product saved as draft.' : 'Product published to your store.');
            navigate('/dashboard/products');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add product');
        } finally {
            setIsLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        /* Increased max-width to accommodate the right sidebar preview */
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold">Add Product</h1>
                <p className="text-sm text-gray-500 mt-1">Add the product details shoppers need to compare, trust, and buy.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── LEFT COLUMN: FORM ────────────────────────────────────────── */}
                <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

                    {/* ── BASIC ─────────────────────────────────────────────── */}
                    <div className="bg-white p-5 rounded-xl border space-y-4">
                        <div>
                            <h2 className="font-semibold text-gray-700">Basic Info</h2>
                            <p className="text-xs text-gray-500 mt-1">Title, category, slug, and SEO text affect how shoppers find this product.</p>
                        </div>

                        <Input id="title" label="Title" value={formData.title} onChange={handleChange} required />

                        <Input id="category" label="Category" value={formData.category} onChange={handleChange} />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input id="slug" label="Product Slug" value={formData.slug} onChange={handleChange} />
                            <Input id="tags" label="Tags" value={formData.tags} onChange={handleChange} />
                            <Input id="lowStockThreshold" label="Low Stock Alert" type="number" value={formData.lowStockThreshold} onChange={handleChange} />
                        </div>

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

                        {/* ✨ AI Description Section */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-end mb-1">
                                <label className="block text-sm font-medium text-gray-700">Description</label>

                                <button
                                    type="button"
                                    onClick={handleGenerateDescription}
                                    disabled={isGenerating || !formData.title}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={14} />
                                    )}
                                    {isGenerating ? 'Generating...' : 'Auto-Write with AI'}
                                </button>
                            </div>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
                                placeholder="Explain what it is, who it is for, key benefits, and what comes in the box."
                                rows={4}
                                required
                            />
                        </div>
                    </div>

                    {/* ── MEDIA ─────────────────────────────────────────────── */}
                    <div className="bg-white p-5 rounded-xl border space-y-4">
                        <div>
                            <h2 className="font-semibold flex items-center gap-2">
                                <ImageIcon size={16} /> Media
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">Use clear product images from multiple angles. The first image becomes the product card cover.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-600">Images (max 10)</label>
                                <input
                                    type="file" accept="image/*" multiple
                                    onChange={(e) => setImageFiles(Array.from(e.target.files))}
                                    className="w-full border rounded-lg p-2 text-sm bg-gray-50"
                                />
                                {imageFiles.length > 0 && (
                                    <p className="text-xs text-indigo-600 font-medium">{imageFiles.length} image(s) selected</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                    <Video size={14} /> Videos (max 2)
                                </label>
                                <input
                                    type="file" accept="video/*" multiple
                                    onChange={(e) => setVideoFiles(Array.from(e.target.files))}
                                    className="w-full border rounded-lg p-2 text-sm bg-gray-50"
                                />
                                {videoFiles.length > 0 && (
                                    <p className="text-xs text-indigo-600 font-medium">{videoFiles.length} video(s) selected</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── PRICING ───────────────────────────────────────────── */}
                    <div className="bg-white p-5 rounded-xl border space-y-4">
                        <div>
                            <h2 className="font-semibold text-gray-700">Pricing</h2>
                            <p className="text-xs text-gray-500 mt-1">Buying price is private. Selling price and discount are visible to shoppers.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input id="buyingPrice"  label="Buying Price"     type="number" onChange={handlePricing} required />
                            <Input id="sellingPrice" label="Selling Price"    type="number" onChange={handlePricing} required />
                            <Input id="discount"     label="Discount %" type="number" onChange={handlePricing} />
                        </div>
                        <div className={`p-4 rounded-lg border text-sm space-y-1 ${profit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Final Price:</span>
                                <span className="font-bold text-indigo-600">৳ {Math.round(finalPrice || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Estimated Profit:</span>
                                <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ৳ {profit.toFixed(2)} {profit < 0 && '(Loss!)'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── VARIANT MATRIX ────────────────────────────────────── */}
                    <div className="bg-white p-5 rounded-xl border space-y-5">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="font-semibold text-gray-700">Variants</h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Add options like color or size. They are combined into sellable variants.
                                </p>
                            </div>
                            {combinations.length > 0 && (
                                <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-1 rounded-full font-medium">
                                    {combinations.length} combo{combinations.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Attribute rows */}
                        <div className="space-y-3">
                            {attributes.map((attr, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                    <input
                                        className="w-28 shrink-0 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        placeholder="e.g. color"
                                        value={attr.name}
                                        onChange={(e) => setAttrName(i, e.target.value)}
                                    />

                                    <div className="flex-1 flex flex-wrap items-center gap-1.5 border rounded-lg px-2 py-1.5 min-h-[36px] focus-within:ring-2 focus-within:ring-indigo-300">
                                        {attr.options.map(opt => (
                                            <span
                                                key={opt}
                                                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full"
                                            >
                                                {opt}
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(i, opt)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
                                            placeholder={attr.options.length === 0 ? 'Type option, press Enter' : 'Add more…'}
                                            value={optionInputs[i]}
                                            onChange={(e) => {
                                                const inputs = [...optionInputs];
                                                inputs[i] = e.target.value;
                                                setOptionInputs(inputs);
                                            }}
                                            onKeyDown={(e) => handleOptionKeyDown(e, i)}
                                            onBlur={() => commitOption(i, optionInputs[i])}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeAttribute(i)}
                                        disabled={attributes.length === 1}
                                        className="mt-1.5 text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addAttribute}
                            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
                        >
                            <Plus size={14} /> Add attribute
                        </button>

                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                Default stock
                            </label>
                            <input
                                type="number" min={0}
                                value={defaultStock}
                                onChange={(e) => handleDefaultStockChange(e.target.value)}
                                className="w-24 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            {Object.keys(stockOverrides).length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setAllStock(defaultStock)}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                                >
                                    Reset all to {defaultStock}
                                </button>
                            )}
                        </div>

                        {combinations.length > 0 && (
                            <div className="border rounded-xl overflow-x-auto mt-4">
                                <table className="min-w-[1180px] w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 font-medium">Variant</th>
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
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {combinations.map((combo) => {
                                        const key       = makePipeKey(combo);
                                        const isOverride = stockOverrides[key] !== undefined && stockOverrides[key] !== defaultStock;
                                        return (
                                            <tr key={key} className="hover:bg-gray-50/60">
                                                <td className="px-4 py-2 flex flex-wrap gap-1.5">
                                                    {combo.map(a => (
                                                        <span key={a.name} className="text-gray-700">
                                                            <span className="text-gray-400 text-xs mr-0.5">{a.name}:</span>
                                                            <span className="font-medium">{a.value}</span>
                                                        </span>
                                                    ))}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        value={getVariantField(combo, 'sku')}
                                                        onChange={(e) => setVariantField(combo, 'sku', e.target.value.toUpperCase())}
                                                        placeholder="SKU"
                                                        className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number" min={0}
                                                        value={getVariantField(combo, 'price')}
                                                        onChange={(e) => setVariantField(combo, 'price', e.target.value)}
                                                        placeholder={formData.pricing.sellingPrice || '0'}
                                                        className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number" min={0}
                                                        value={getVariantField(combo, 'compareAtPrice')}
                                                        onChange={(e) => setVariantField(combo, 'compareAtPrice', e.target.value)}
                                                        placeholder="0"
                                                        className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number" min={0}
                                                        value={getVariantField(combo, 'costPrice')}
                                                        onChange={(e) => setVariantField(combo, 'costPrice', e.target.value)}
                                                        placeholder={formData.pricing.buyingPrice || '0'}
                                                        className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number" min={0}
                                                        value={getStock(combo)}
                                                        onChange={(e) => setStock(combo, e.target.value)}
                                                        className={`w-20 text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                                                            isOverride ? 'border-indigo-300 bg-indigo-50/50' : ''
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number" min={0}
                                                        value={getVariantField(combo, 'lowStockThreshold', formData.lowStockThreshold || 5)}
                                                        onChange={(e) => setVariantField(combo, 'lowStockThreshold', e.target.value)}
                                                        className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        value={getVariantField(combo, 'barcode')}
                                                        onChange={(e) => setVariantField(combo, 'barcode', e.target.value)}
                                                        placeholder="Barcode"
                                                        className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number" min={0}
                                                        value={getVariantField(combo, 'weight')}
                                                        onChange={(e) => setVariantField(combo, 'weight', e.target.value)}
                                                        placeholder="kg"
                                                        className="w-full text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="grid grid-cols-3 gap-1">
                                                        {['length', 'width', 'height'].map(field => (
                                                            <input
                                                                key={field}
                                                                type="number"
                                                                min={0}
                                                                value={getVariantField(combo, field)}
                                                                onChange={(e) => setVariantField(combo, field, e.target.value)}
                                                                placeholder={field[0].toUpperCase()}
                                                                className="w-full border rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                            />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        value={getVariantField(combo, 'image')}
                                                        onChange={(e) => setVariantField(combo, 'image', e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={getVariantField(combo, 'status', 'active')}
                                                        onChange={(e) => setVariantField(combo, 'status', e.target.value)}
                                                        className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="draft">Draft</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={getVariantField(combo, 'taxable', true)}
                                                        onChange={(e) => setVariantField(combo, 'taxable', e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {validAttrs.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-2">
                                Add an attribute name and at least one option, e.g. color: black, white.
                            </p>
                        )}
                    </div>

                    {/* ── FEATURES / SPECS / COMMENTS ───────────────────────── */}
                    {['features', 'specifications', 'comments'].map((type) => (
                        <div key={type} className="bg-white p-5 rounded-xl border space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="font-semibold capitalize text-gray-700">{type}</h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {type === 'features' ? 'Short selling points shown on the product page.' : type === 'specifications' ? 'Technical details like material, size, model, or warranty.' : 'Optional extra notes for shoppers.'}
                                    </p>
                                </div>
                                <button
                                    type="button" onClick={() => addKV(type)}
                                    className="text-indigo-600 text-sm flex items-center gap-1 hover:text-indigo-700 font-medium"
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                            {formData[type].map((item, index) => (
                                <div key={index} className="grid grid-cols-2 gap-2 relative pr-6">
                                    <input
                                        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        placeholder="Title (e.g. Material)"
                                        value={item.title}
                                        onChange={(e) => handleKVChange(type, index, 'title', e.target.value)}
                                    />
                                    <input
                                        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        placeholder="Value (e.g. Cotton)"
                                        value={item.value}
                                        onChange={(e) => handleKVChange(type, index, 'value', e.target.value)}
                                    />
                                    <button
                                        type="button" onClick={() => removeKV(type, index)}
                                        className="absolute right-0 top-2.5 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                            {formData[type].length === 0 && (
                                <p className="text-xs text-gray-400">Nothing added yet. Add details if they help shoppers decide.</p>
                            )}
                        </div>
                    ))}

                    <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
                        Save Product
                    </Button>
                </form>

                {/* ── RIGHT COLUMN: LIVE PREVIEW ───────────────────────────────── */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 space-y-4">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Eye size={16} /> Live Storefront Preview
                        </h2>

                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                            {/* Image Section */}
                            <div className="relative aspect-[4/5] bg-gray-50 flex items-center justify-center p-6 border-b border-gray-50 overflow-hidden">
                                {previewImageUrl ? (
                                    <img
                                        src={previewImageUrl}
                                        alt="Preview"
                                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-300">
                                        <ImageIcon size={48} className="mb-2 opacity-50" />
                                        <span className="text-xs font-medium">No Image</span>
                                    </div>
                                )}

                                {/* Discount Badge */}
                                {formData.pricing.discount > 0 && (
                                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md">
                                        -{formData.pricing.discount}%
                                    </div>
                                )}
                            </div>

                            {/* Details Section */}
                            <div className="p-6">
                                <div className="min-h-[20px] mb-2">
                                    {formData.category ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                            {formData.category}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-gray-300 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md">
                                            Category
                                        </span>
                                    )}
                                </div>

                                <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 leading-tight min-h-[50px]">
                                    {formData.title || 'Your Product Title Will Appear Here'}
                                </h3>

                                <div className="flex items-center gap-3 mb-4">
                                    <p className="font-extrabold text-indigo-600 text-2xl">
                                        ৳ {Math.round(finalPrice || 0)}
                                    </p>
                                    {formData.pricing.discount > 0 && (
                                        <p className="text-sm text-gray-400 line-through font-medium">
                                            ৳ {formData.pricing.sellingPrice || 0}
                                        </p>
                                    )}
                                </div>

                                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed min-h-[40px] mb-6">
                                    {formData.description || 'Start typing a description or use the AI tool to auto-generate one...'}
                                </p>

                                <button
                                    type="button"
                                    disabled
                                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed"
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddProduct;
