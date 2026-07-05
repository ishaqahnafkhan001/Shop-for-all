import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Boxes, DollarSign, FileText, Image as ImageIcon, ListChecks, PackagePlus, Plus, Search, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import {
    ImageEmptyState,
    ProductFormSection,
    ReadinessChecklist,
    SellerHint
} from '../../../components/products/ProductFormUX.jsx';
import ProductAiAssistant from '../../../components/products/ProductAiAssistant.jsx';
import { SeoHealthCard, SeoLengthHint, SeoSnippetPreview } from '../../../components/seo/SeoPreview.jsx';
import { buildProductSeoPreview, scoreProductSeo, truncateSeoText } from '../../../utils/seoHealth.js';
import {
    MAX_SELLING_POINTS,
    hasIncompleteKeyValueRow,
    hasIncompleteSellingPoint,
    normalizeKeyValueRows,
    normalizeSellingPointRows
} from '../../../utils/productContentRows.js';

/**
 * EditProduct
 * ─────────────────────────────────────────────────────────────────────────────
 * Variant operations map to 3 backend ops:
 *
 * 1. Variant metadata & New Variants → saved on main submit (Op A: flat variants patch)
 *    Existing stock changes use the inventory adjustment route for auditability.
 * 2. Remove button              → immediate PATCH      (Op D: removeVariants)
 * 3. Add Option                 → its own action       (Op C: addAttributeOption)
 */
const normalizeVariantForEdit = (variant = {}) => {
    const stock = Number(variant.inventory?.stock ?? variant.stock ?? 0);
    const status = variant.status || (variant.isActive === false ? 'draft' : 'active');

    return {
        ...variant,
        attributes: Array.isArray(variant.attributes)
            ? variant.attributes.map(attr => ({
                name: String(attr?.name || '').trim(),
                value: String(attr?.value || '').trim()
            })).filter(attr => attr.name || attr.value)
            : [],
        stock,
        inventory: {
            lowStockThreshold: 5,
            trackQuantity: true,
            allowOversell: false,
            reservedStock: 0,
            ...(variant.inventory || {}),
            stock
        },
        pricing: {
            ...(variant.priceOverride !== undefined ? { price: variant.priceOverride } : {}),
            ...(variant.pricing || {})
        },
        status,
        isActive: status === 'active' && variant.isActive !== false
    };
};

const buildProductFormState = (product = {}) => ({
    title:          product.title          || '',
    slug:           product.slug           || '',
    description:    product.description    || '',
    category:       product.category       || '',
    tags:           (product.tags || []).join(', '),
    status:         product.status         || (product.isActive ? 'Published' : 'Draft'),
    publicationStatus: product.publicationStatus || (product.status === 'Published' ? 'published' : 'draft'),
    publishAt:      product.publishAt ? new Date(product.publishAt).toISOString().slice(0, 16) : '',
    lowStockThreshold: product.lowStockThreshold || 5,
    imageAltText:   product.imageAltText   || '',
    seo: {
        title:       product.seo?.title       || '',
        description: product.seo?.description || ''
    },
    pricing: {
        buyingPrice:  product.pricing?.buyingPrice  || 0,
        sellingPrice: product.pricing?.sellingPrice || 0,
        discount:     product.pricing?.discount     || 0
    },
    variants:       (product.variants || []).map(normalizeVariantForEdit),
    images:         product.images         || [],
    features:       normalizeSellingPointRows(product.features),
    specifications: normalizeKeyValueRows(product.specifications),
    comments:       normalizeKeyValueRows(product.comments)
});

const EditProduct = () => {
    const navigate    = useNavigate();
    const { id }      = useParams();

    const [loading,      setLoading]      = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockSubmittingId, setStockSubmittingId] = useState('');
    const stockIdempotencyCounterRef = useRef(0);

    // ── Scalar + variant state ────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        title:          '',
        slug:           '',
        description:    '',
        category:       '',
        tags:           '',
        status:         'Published',
        publicationStatus: 'published',
        publishAt:      '',
        lowStockThreshold: 5,
        imageAltText:   '',
        seo:            { title: '', description: '' },
        pricing:        { buyingPrice: 0, sellingPrice: 0, discount: 0 },
        variants:       [],    // live variant list (reflects DB state + local additions)
        images:         [],
        features:       [],
        specifications: [],
        comments:       []
    });
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const [coverImageIndex, setCoverImageIndex] = useState(0);

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
        formData.variants.flatMap(v => (v.attributes || []).map(a => a.name).filter(Boolean))
    )];

    // ── Load product ──────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const res = await API.get(`/admin/products/${id}`);
                const product = res.data.data || res.data;
                setFormData(buildProductFormState(product));
                setNewImageFiles([]);
                setRemovedImages([]);
                setCoverImageIndex(0);
            } catch {
                toast.error('Failed to load product');
                navigate('/dashboard/products');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, navigate]);

    useEffect(() => {
        const previews = newImageFiles.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
        queueMicrotask(() => setNewImagePreviews(previews));

        return () => {
            previews.forEach(preview => URL.revokeObjectURL(preview.url));
        };
    }, [newImageFiles]);

    // ── Scalar handlers ───────────────────────────────────────────────────────
    const handleChange  = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });
    const handlePublicationStatusChange = (value) => {
        if (value === 'Scheduled') {
            setFormData(prev => ({ ...prev, status: 'Draft', publicationStatus: 'scheduled' }));
        } else {
            setFormData(prev => ({
                ...prev,
                status: value,
                publicationStatus: value === 'Published' ? 'published' : 'draft',
                publishAt: value === 'Published' ? '' : prev.publishAt
            }));
        }
    };
    const handlePricing = (e) => setFormData({
        ...formData,
        pricing: { ...formData.pricing, [e.target.id]: Number(e.target.value) }
    });

    const handleImageFiles = (files) => {
        const selected = Array.from(files || []).filter(file => file.type?.startsWith('image/'));
        if (selected.length === 0) return;

        setNewImageFiles(prev => {
            const total = formData.images.length + prev.length + selected.length;
            if (total > 5) {
                toast.error('You can keep up to 5 product images.');
                return prev;
            }
            return [...prev, ...selected];
        });
    };

    const removeExistingImage = (imageUrl) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter(image => image !== imageUrl)
        }));
        setRemovedImages(prev => [...new Set([...prev, imageUrl])]);
        setCoverImageIndex(0);
    };

    const removeNewImage = (index) => {
        setNewImageFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index));
        setCoverImageIndex(0);
    };

    // ── Stock handler ─────────────────────────────────────────────────────────
    const handleStockChange = (variantId, value) => {
        if (!String(variantId).startsWith('temp_')) return;
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

    const handleAdjustExistingStock = async (variant) => {
        const variantId = variant?._id?.toString();
        if (!variantId) {
            toast.error('Save this variant before adjusting stock.');
            return;
        }
        const currentStock = Number(variant.stock || variant.inventory?.stock || 0);
        const rawQuantity = window.prompt(
            `Current stock is ${currentStock}. Enter an adjustment amount, for example 10 to restock or -2 to reduce.`
        );
        if (rawQuantity === null) return;
        const quantity = Number(rawQuantity);
        if (!Number.isFinite(quantity) || quantity === 0) {
            toast.error('Enter a non-zero stock adjustment.');
            return;
        }

        stockIdempotencyCounterRef.current += 1;
        const idempotencyKey = `stock-adjust:${id}:${variantId}:${stockIdempotencyCounterRef.current}`;
        setStockSubmittingId(variantId);
        try {
            const { data } = await API.patch('/admin/inventory/stock', {
                productId: id,
                variantId,
                mode: 'adjust',
                quantity,
                reason: quantity > 0 ? 'restock' : 'manual_reduction',
                note: 'Adjusted from product edit variant table',
                idempotencyKey
            });
            const afterStock = Number(data.data?.afterStock);
            if (Number.isFinite(afterStock)) {
                setFormData(prev => ({
                    ...prev,
                    variants: prev.variants.map(item => {
                        const itemId = item._id?.toString() || item._tempId;
                        if (itemId !== variantId) return item;
                        return {
                            ...item,
                            stock: afterStock,
                            inventory: {
                                ...(item.inventory || {}),
                                stock: afterStock
                            }
                        };
                    })
                }));
                setChangedStocks(prev => {
                    const next = { ...prev };
                    delete next[variantId];
                    return next;
                });
            }
            toast.success(data.message || 'Stock adjusted');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to adjust stock');
        } finally {
            setStockSubmittingId('');
        }
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
    const addKV = (type) => setFormData(prev => {
        if (type === 'features' && prev.features.length >= MAX_SELLING_POINTS) {
            toast.error(`You can add up to ${MAX_SELLING_POINTS} customer benefits.`);
            return prev;
        }

        return {
            ...prev,
            [type]: [
                ...prev[type],
                type === 'features' ? { point: '', reason: '' } : { title: '', value: '' }
            ]
        };
    });
    const removeKV = (type, index) => setFormData({ ...formData, [type]: formData[type].filter((_, i) => i !== index) });

    // ── Pricing display ───────────────────────────────────────────────────────
    const selling    = Number(formData.pricing.sellingPrice) || 0;
    const buying     = Number(formData.pricing.buyingPrice)  || 0;
    const discount   = Number(formData.pricing.discount)     || 0;
    const finalPrice = selling - (selling * discount / 100);
    const profit     = finalPrice - buying;
    const totalStock = formData.variants.reduce((sum, variant) => sum + Number(getDisplayStock(variant) || 0), 0);
    const productSeoPreview = buildProductSeoPreview({ product: formData, shopName: 'Your Store' });
    const productSeoHealth = scoreProductSeo({
        product: { ...formData, stock: totalStock },
        hasImage: Boolean(formData.images?.length || newImageFiles.length || formData.variants.some(variant => variant.image))
    });
    const readinessItems = [
        { label: 'Product title is clear', done: Boolean(formData.title.trim()), helper: 'Use the name customers search for.' },
        { label: 'Category is selected', done: Boolean(formData.category.trim()), helper: 'Categories help filters and sections work correctly.' },
        { label: 'Selling price is set', done: selling > 0, helper: 'A product needs a customer-facing price.' },
        { label: 'Product image is set', done: Boolean(formData.images?.length || newImageFiles.length), helper: 'The first image becomes the product card cover.' },
        { label: 'Image alt text added', done: Boolean(formData.imageAltText.trim()), helper: 'Describe the main product image for search and accessibility.' },
        { label: 'Stock is available', done: totalStock > 0, helper: 'Keep stock updated to avoid cancelled orders.' },
        { label: 'Description helps shoppers', done: formData.description.trim().length >= 20, helper: 'Explain material, use case, or key benefit.' },
        { label: 'Product is published', done: formData.status === 'Published', helper: 'Draft products stay hidden from shoppers.' }
    ];

    const getAiVariants = () => formData.variants.map(variant => ({
        attributes: variant.attributes || [],
        stock: Number(getDisplayStock(variant) || 0),
        priceOverride: Number(variant.pricing?.price || variant.priceOverride || formData.pricing.sellingPrice || 0)
    }));

    const getFirstAiImage = () => (
        (coverImageIndex >= formData.images.length
            ? newImageFiles[coverImageIndex - formData.images.length]
            : null)
        || newImageFiles[0]
        || formData.images?.[coverImageIndex]
        || formData.images?.find(Boolean)
        || formData.variants?.find(variant => variant.image)?.image
        || null
    );

    const handleGenerateSeo = () => {
        if (!formData.title.trim()) {
            toast.error('Add a product title first.');
            return;
        }

        setFormData(prev => ({
            ...prev,
            seo: {
                title: prev.seo.title || truncateSeoText(`${prev.title}${prev.category ? ` | ${prev.category}` : ''}`, 70),
                description: prev.seo.description || truncateSeoText(prev.description || `Buy ${prev.title} online from this store.`, 160)
            }
        }));
        toast.success('SEO preview filled from product info. Review it before updating.');
    };

    // ── Main submit (scalar + variant metadata + new variants) ────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (hasIncompleteSellingPoint(formData.features)) {
                toast.error('Each selling point needs both a point and why it matters.');
                setIsSubmitting(false);
                return;
            }
            if (hasIncompleteKeyValueRow(formData.specifications) || hasIncompleteKeyValueRow(formData.comments)) {
                toast.error('Each detail row needs both a title and value.');
                setIsSubmitting(false);
                return;
            }

            const body = new FormData();
            body.append('title', formData.title);
            if (formData.slug) body.append('slug', formData.slug);
            body.append('description', formData.description);
            body.append('category', formData.category);
            body.append('tags', JSON.stringify(formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)));
            body.append('status', formData.status);
            body.append('publicationStatus', formData.publicationStatus);
            if (formData.publicationStatus === 'scheduled') body.append('publishAt', formData.publishAt);
            body.append('lowStockThreshold', String(formData.lowStockThreshold || 5));
            body.append('imageAltText', formData.imageAltText);
            body.append('seo', JSON.stringify(formData.seo));
            body.append('pricing', JSON.stringify(formData.pricing));
            body.append('features', JSON.stringify(normalizeSellingPointRows(formData.features)));
            body.append('specifications', JSON.stringify(normalizeKeyValueRows(formData.specifications)));
            body.append('comments', JSON.stringify(normalizeKeyValueRows(formData.comments)));
            body.append('existingImages', JSON.stringify(formData.images || []));
            body.append('removedImages', JSON.stringify(removedImages));
            body.append('coverImageIndex', JSON.stringify(coverImageIndex));
            newImageFiles.forEach(file => body.append('images', file));

            // Process modified variant metadata and newly created local variants.
            // Existing stock changes must go through /admin/inventory/stock so movement history and alerts stay authoritative.
            if (Object.keys(changedStocks).length > 0) {
                const variantsPayload = formData.variants
                    .filter(v => {
                        const vid = v._id?.toString() || v._tempId;
                        return changedStocks[vid] !== undefined;
                    })
                    .map(v => {
                        const vid = v._id?.toString() || v._tempId;
                        const isExistingVariant = Boolean(v._id);
                        const stockForNewVariant = changedStocks[vid] ?? v.stock;
                        const inventory = { ...(v.inventory || {}) };
                        if (isExistingVariant) {
                            delete inventory.stock;
                        } else {
                            inventory.stock = stockForNewVariant;
                        }
                        const payload = {
                            attributes:    v.attributes,
                            priceOverride: v.pricing?.price ?? v.priceOverride,
                            pricing:       v.pricing,
                            inventory,
                            image:         v.image,
                            sku:           v.sku,
                            barcode:       v.barcode,
                            weight:        v.weight,
                            dimensions:    v.dimensions,
                            status:        v.status || (v.isActive === false ? 'draft' : 'active'),
                            tax:           v.tax,
                            isActive:      v.isActive !== undefined ? v.isActive : true
                        };
                        if (!isExistingVariant) {
                            payload.stock = stockForNewVariant;
                        }
                        // Only attach _id if it's a pre-existing variant.
                        // Backend will create new ones if _id is missing.
                        if (v._id) {
                            payload._id = v._id;
                        }
                        return payload;
                    });
                body.append('variants', JSON.stringify(variantsPayload));
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
                    <ProductAiAssistant
                        formData={formData}
                        setFormData={setFormData}
                        getFirstImage={getFirstAiImage}
                        getVariants={getAiVariants}
                    />
                    <Input id="title" label="Title" value={formData.title} onChange={handleChange} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="slug" label="Product URL slug" value={formData.slug} onChange={handleChange} helperText="Changing the product URL may affect shared links. Old ID links redirect when supported." />
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
                            value={formData.publicationStatus === 'scheduled' ? 'Scheduled' : formData.status}
                            onChange={(event) => handlePublicationStatusChange(event.target.value)}
                            className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            <option>Published</option>
                            <option>Draft</option>
                            <option>Scheduled</option>
                            <option>Archived</option>
                        </select>
                    </label>
                    {formData.publicationStatus === 'scheduled' && (
                        <>
                            <Input
                                id="publishAt"
                                label="Publish date and time"
                                type="datetime-local"
                                value={formData.publishAt}
                                onChange={handleChange}
                                helperText="Scheduled products stay hidden until this time. Server time publishes them automatically."
                                required
                            />
                            <SellerHint>
                                Want to promote this upcoming product on the storefront? Open Launch Banners and connect this scheduled product to a countdown banner.
                                <button
                                    type="button"
                                    onClick={() => navigate('/dashboard/banners')}
                                    className="ml-2 font-black text-indigo-700 underline underline-offset-2"
                                >
                                    Open Launch Banners
                                </button>
                            </SellerHint>
                        </>
                    )}
                </ProductFormSection>

                <ProductFormSection
                    title="2. SEO details"
                    description="Optional search text for Google and shared links."
                    icon={Search}
                >
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">Preview and improve how this product appears in Google.</p>
                        <button
                            type="button"
                            onClick={handleGenerateSeo}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                        >
                            Generate from product info
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Input
                                id="seoTitle"
                                label="SEO title"
                                value={formData.seo.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, title: e.target.value } }))}
                                helperText="Recommended: 50-70 characters."
                            />
                            <SeoLengthHint value={formData.seo.title} min={50} max={70} label="SEO title" />
                        </div>
                        <div>
                            <Input
                                id="seoDescription"
                                label="SEO description"
                                value={formData.seo.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, description: e.target.value } }))}
                                helperText="Recommended: 120-160 characters."
                            />
                            <SeoLengthHint value={formData.seo.description} min={120} max={160} label="SEO description" />
                        </div>
                    </div>
                    <SeoSnippetPreview {...productSeoPreview} />
                    <Input
                        id="imageAltText"
                        label="Product image alt text"
                        value={formData.imageAltText}
                        onChange={handleChange}
                        helperText="Describe the main product image. This improves accessibility and image SEO."
                    />
                </ProductFormSection>

                <ProductFormSection
                    title="3. Product images"
                    description="Add, remove, or choose the cover image shown on product cards."
                    icon={ImageIcon}
                >
                    <ImageEmptyState selectedCount={(formData.images?.length || 0) + newImageFiles.length} max={5} />
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Add images</label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => handleImageFiles(event.target.files)}
                            className="w-full rounded-lg border bg-gray-50 p-2 text-sm"
                        />
                        <p className="text-xs text-gray-500">
                            Existing images stay unless you remove them. You can keep up to 5 images total.
                        </p>
                    </div>

                    {(formData.images?.length > 0 || newImagePreviews.length > 0) && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {formData.images.map((imageUrl, index) => (
                                <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                                    <img src={imageUrl} alt={formData.imageAltText || formData.title || `Product image ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCoverImageIndex(index)}
                                            className={`rounded-full px-2 py-1 text-[11px] font-bold ${coverImageIndex === index ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                        >
                                            {coverImageIndex === index ? 'Cover' : 'Make cover'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(imageUrl)}
                                            className="rounded-full bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
                                            aria-label={`Remove product image ${index + 1}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {newImagePreviews.map((preview, index) => {
                                const absoluteIndex = formData.images.length + index;
                                return (
                                    <div key={`${preview.file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50 p-2">
                                        <img src={preview.url} alt={`New product image ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCoverImageIndex(absoluteIndex)}
                                                className={`rounded-full px-2 py-1 text-[11px] font-bold ${coverImageIndex === absoluteIndex ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700'}`}
                                            >
                                                {coverImageIndex === absoluteIndex ? 'Cover' : 'Make cover'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeNewImage(index)}
                                                className="rounded-full bg-white p-1.5 text-red-500 hover:bg-red-50"
                                                aria-label={`Remove new product image ${index + 1}`}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ProductFormSection>

                {/* ── PRICING ───────────────────────────────────────────── */}
                <ProductFormSection
                    title="4. Pricing"
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
                    title="5. Stock and product variants"
                    description="Variants are sellable options like size, color, storage, or style."
                    icon={Boxes}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-400 mt-0.5">Edit variant details here. Existing stock changes use Adjust stock so movement history and alerts stay accurate.</p>
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
                                            {isNew ? (
                                                <input
                                                    type="number" min={0}
                                                    value={getDisplayStock(v)}
                                                    onChange={(e) => handleStockChange(vid, e.target.value)}
                                                    className={`w-20 text-right border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors ${
                                                        isModified ? 'border-amber-300 bg-amber-50/60' : ''
                                                    }`}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="font-semibold text-slate-800">{getDisplayStock(v)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdjustExistingStock(v)}
                                                        disabled={stockSubmittingId === vid}
                                                        className="rounded-lg border border-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {stockSubmittingId === vid ? 'Saving...' : 'Adjust'}
                                                    </button>
                                                </div>
                                            )}
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
                            {Object.keys(changedStocks).length} pending variant detail change(s) — saved when you click "Update Product"
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
                        title={`${6 + index}. ${type === 'features' ? 'Why customers should buy this' : type === 'specifications' ? 'Specifications' : 'Extra notes'}`}
                        description={type === 'features' ? 'Add short product benefits and explain why each one matters to the customer.' : type === 'specifications' ? 'Technical details like material, size, model, or warranty.' : 'Customer-facing care, storage, sizing, or styling notes shown on the product page.'}
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
                                <h2 className="font-semibold text-gray-700">{type === 'features' ? 'Customer benefits' : type === 'comments' ? 'Extra notes' : type}</h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    {type === 'features' ? 'Use a short point on the left and a convincing customer-focused reason on the right.' : type === 'specifications' ? 'Technical details like material, size, model, or warranty.' : 'Customer-facing care, storage, sizing, or styling notes shown on the product page.'}
                                </p>
                            </div>
                        </div>
                        {formData[type].map((item, i) => (
                            <div key={i} className={type === 'features'
                                ? 'grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)_auto]'
                                : 'grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)_auto]'
                            }>
                                <label className="block text-xs font-bold text-slate-600">
                                    {type === 'features' ? 'Point' : 'Title'}
                                    <input
                                        className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        placeholder={type === 'features' ? 'e.g. Design' : 'Title'}
                                        value={type === 'features' ? (item.point ?? item.title ?? '') : (item.title ?? '')}
                                        onChange={(e) => handleKVChange(type, i, type === 'features' ? 'point' : 'title', e.target.value)}
                                        maxLength={type === 'features' ? 50 : 100}
                                    />
                                </label>
                                <label className="block text-xs font-bold text-slate-600">
                                    {type === 'features' ? 'Why it matters' : 'Value'}
                                    {type === 'features' ? (
                                        <textarea
                                            className="mt-1 min-h-20 w-full resize-y border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            placeholder="e.g. Engraved traditional detailing creates an elegant festive look."
                                            value={item.reason ?? item.value ?? ''}
                                            onChange={(e) => handleKVChange(type, i, 'reason', e.target.value)}
                                            maxLength={220}
                                        />
                                    ) : (
                                        <input
                                            className="mt-1 w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            placeholder="Value"
                                            value={item.value}
                                            onChange={(e) => handleKVChange(type, i, 'value', e.target.value)}
                                        />
                                    )}
                                </label>
                                <button
                                    type="button" onClick={() => removeKV(type, i)}
                                    className="self-end rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                                    aria-label={`Remove ${type === 'features' ? 'selling point' : 'row'} ${i + 1}`}
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
                    <SeoHealthCard
                        title="Product SEO score"
                        score={productSeoHealth.score}
                        tasks={productSeoHealth.tasks}
                        description={`This product SEO score is ${productSeoHealth.score}/100. Fix missing basics before publishing.`}
                    />
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">
                        <p className="font-black text-slate-950">Seller note</p>
                        <p className="mt-2">
                            Changes to price, variant details, and status affect the live storefront after you click Update Product. Existing stock changes are saved through Adjust stock.
                        </p>
                    </div>
                </div>

            </form>
        </div>
    );
};

export default EditProduct;
