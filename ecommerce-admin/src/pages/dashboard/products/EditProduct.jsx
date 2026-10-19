import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Boxes, DollarSign, FileText, Image as ImageIcon, ListChecks, PackagePlus, Plus, Search, Trash2, ChevronDown, ChevronUp, X, ArrowLeft, Check, Clock3, Save, Loader2, RotateCcw } from 'lucide-react';
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
import SellerFactsEditor from '../../../components/products/SellerFactsEditor.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { SeoHealthCard, SeoLengthHint, SeoSnippetPreview } from '../../../components/seo/SeoPreview.jsx';
import { hasFeature } from '../../../utils/featureAccess.js';
import { buildProductSeoPreview, scoreProductSeo, truncateSeoText } from '../../../utils/seoHealth.js';
import { blankSellerFacts, normalizeSellerFacts } from '../../../utils/sellerFacts.js';
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
// Keep datetime-local values in the seller's local timezone (toISOString is UTC).
const formatLocalDateTime = value => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = part => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getFormFingerprint = data => JSON.stringify({
    ...data, variants: undefined, updatedAt: undefined
});

const isSafeImageUrl = value => {
    if (typeof value !== 'string') return false;
    const url = value.trim();
    // No javascript:, data:, blob:, protocol-relative or arbitrary HTTP origins.
    return (url.startsWith('/') && !url.startsWith('//')) || /^https:\/\/[^\s]+$/i.test(url);
};

const readableError = error => {
    const body = error?.response?.data;
    for (const value of [body?.error, body?.message, body?.details]) {
        if (typeof value === 'string' && value.trim()) return value;
    }
    return error?.request ? 'Network error. Your changes may not have reached the server.' : 'Could not complete the action. Please try again.';
};

const variantKey = variant => (variant.attributes || [])
    .map(attribute => `${String(attribute.name || '').trim().toLowerCase()}:${String(attribute.value || '').trim().toLowerCase()}`)
    .sort().join('|');

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
    updatedAt: product.updatedAt,
    title:          product.title          || '',
    slug:           product.slug           || '',
    description:    product.description    || '',
    category:       product.category       || '',
    tags:           Array.isArray(product.tags) ? product.tags.join(', ') : String(product.tags || ''),
    status:         product.status         || (product.isActive ? 'Published' : 'Draft'),
    publicationStatus: product.publicationStatus || (product.status === 'Published' ? 'published' : 'draft'),
    publishAt:      formatLocalDateTime(product.publishAt),
    lowStockThreshold: product.lowStockThreshold ?? 5,
    imageAltText:   product.imageAltText   || '',
    seo: {
        title:       product.seo?.title       || '',
        description: product.seo?.description || ''
    },
    pricing: {
        buyingPrice:  product.pricing?.buyingPrice  ?? 0,
        sellingPrice: product.pricing?.sellingPrice ?? 0,
        discount:     product.pricing?.discount     ?? 0
    },
    variants:       (product.variants || []).map(normalizeVariantForEdit),
    images:         Array.isArray(product.images) ? product.images : [],
    features:       normalizeSellingPointRows(product.features),
    specifications: normalizeKeyValueRows(product.specifications),
    comments:       normalizeKeyValueRows(product.comments),
    sellerFacts:    normalizeSellerFacts(product.sellerFacts)
});

const EditProduct = () => {
    const navigate    = useNavigate();
    const { id }      = useParams();
    const { user } = useAuth();
    const imageLimit = Number(user?.planAccess?.limits?.imagesPerProduct) || 5;
    const canSchedulePublishing = hasFeature(user, 'scheduledProductPublishing');

    const [loading,      setLoading]      = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockSubmittingId, setStockSubmittingId] = useState('');
    const stockIdempotencyCounterRef = useRef(0);
    const tempVariantCounterRef = useRef(0);
    const [initialFormFingerprint, setInitialFormFingerprint] = useState(null);
    const [initialCoverIndex, setInitialCoverIndex] = useState(0);
    const [originalImages, setOriginalImages] = useState([]);
    const stockInputRef = useRef(null);
    const stockReturnFocusRef = useRef(null);
    const [adjustingVariantId, setAdjustingVariantId] = useState(null);
    const [adjustQuantity, setAdjustQuantity] = useState('');
    const [adjustNote, setAdjustNote] = useState('');
    const [actionPending, setActionPending] = useState('');
    const [showVariantTable, setShowVariantTable] = useState(false);


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
        comments:       [],
        sellerFacts:    blankSellerFacts()
    });
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const [coverImageIndex, setCoverImageIndex] = useState(0);

    // Track locally edited variant metadata / unsaved new variants.
    // Existing inventory stock is always changed through the audited API.
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

    const isDirty = initialFormFingerprint !== null && (
        getFormFingerprint(formData) !== initialFormFingerprint ||
        newImageFiles.length > 0 ||
        removedImages.length > 0 ||
        Object.keys(changedStocks).length > 0 ||
        coverImageIndex !== initialCoverIndex
    );
    const isBusy = isSubmitting || Boolean(stockSubmittingId) || isAddingOption || Boolean(actionPending);

    useEffect(() => {
        if (!isDirty) return undefined;
        const warnBeforeUnload = event => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        if (!adjustingVariantId) return undefined;
        const returnFocus = stockReturnFocusRef.current;
        stockInputRef.current?.focus();
        return () => returnFocus?.focus?.();
    }, [adjustingVariantId]);

    useEffect(() => {
        if (!adjustingVariantId) return undefined;
        const onKeyDown = event => {
            if (event.key === 'Escape' && !stockSubmittingId) {
                event.preventDefault();
                setAdjustingVariantId(null);
            }
            if (event.key !== 'Tab') return;
            const dialog = document.querySelector('[aria-labelledby="edit-stock-heading"]');
            if (!dialog) return;
            const focusable = [...dialog.querySelectorAll('input:not(:disabled), button:not(:disabled)')];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [adjustingVariantId, stockSubmittingId]);

    const handleCancel = () => {
        if (isBusy) return;
        if (isDirty && !window.confirm('Discard your unsaved product changes?')) return;
        navigate('/dashboard/products');
    };



    // ── Load product (ignore stale responses when route changes) ───────────────
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await API.get(`/admin/products/${encodeURIComponent(id)}`);
                if (!active) return;
                const product = res.data.data || res.data;
                const nextForm = buildProductFormState(product);
                const coverIndex = Number.isInteger(product.coverImageIndex)
                    ? product.coverImageIndex
                    : Math.max(0, nextForm.images.indexOf(product.coverImageUrl || product.coverMediaId));
                const safeCoverIndex = Math.min(Math.max(0, coverIndex), Math.max(0, nextForm.images.length - 1));

                setInitialFormFingerprint(getFormFingerprint(nextForm));
                setOriginalImages([...nextForm.images]);
                setInitialCoverIndex(safeCoverIndex);
                setFormData(nextForm);
                setNewImageFiles([]);
                setRemovedImages([]);
                setChangedStocks({});
                setCoverImageIndex(safeCoverIndex);
            } catch (error) {
                if (!active) return;
                toast.error(readableError(error));
                navigate('/dashboard/products', { replace: true });
            } finally {
                if (active) setLoading(false);
            }
        };
        queueMicrotask(() => {
            if (active) {
                setLoading(true);
                load();
            }
        });
        return () => { active = false; };
    }, [id, navigate]);

    useEffect(() => {
        let active = true;
        const previews = newImageFiles.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
        queueMicrotask(() => { if (active) setNewImagePreviews(previews); });

        return () => {
            active = false;
            previews.forEach(preview => URL.revokeObjectURL(preview.url));
        };
    }, [newImageFiles]);

    // ── Scalar handlers ───────────────────────────────────────────────────────
    const handleChange = event => setFormData(previous => ({ ...previous, [event.target.id]: event.target.value }));
    const handlePublicationStatusChange = (value) => {
        if (value === 'Scheduled') {
            if (!canSchedulePublishing) {
                toast.error('Scheduled product publishing requires the Pro plan.');
                return;
            }
            setFormData(prev => ({ ...prev, status: 'Draft', publicationStatus: 'scheduled' }));
        } else {
            setFormData(prev => ({
                ...prev,
                status: value,
                publicationStatus: value === 'Published' ? 'published' : 'draft',
                publishAt: value === 'Scheduled' ? prev.publishAt : ''
            }));
        }
    };
    const handlePricing = event => setFormData(previous => ({
        ...previous,
        pricing: { ...previous.pricing, [event.target.id]: event.target.value }
    }));

    const handleImageFiles = (files) => {
        const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
        const incoming = Array.from(files || []);
        const selected = incoming.filter(file => allowed.has(file.type));
        if (selected.length !== incoming.length) {
            toast.error('Use PNG, JPG, WebP, AVIF, or GIF images. SVG and other formats are not accepted here.');
        }
        if (selected.length === 0) return;

        setNewImageFiles(prev => {
            const total = formData.images.length + prev.length + selected.length;
            if (total > imageLimit) {
                toast.error(`Your plan allows up to ${imageLimit} product images. Remove existing images before adding more.`);
                return prev;
            }
            return [...prev, ...selected];
        });
    };

    const removeExistingImage = (imageUrl, index) => {
        setFormData(previous => ({
            ...previous,
            images: previous.images.filter((_, position) => position !== index)
        }));
        setRemovedImages(previous => [...new Set([...previous, imageUrl])]);
        setCoverImageIndex(current => current > index ? current - 1 : current === index ? 0 : current);
    };

    const removeNewImage = index => {
        const absoluteIndex = formData.images.length + index;
        setNewImageFiles(previous => previous.filter((_, position) => position !== index));
        setCoverImageIndex(current => current > absoluteIndex ? current - 1 : current === absoluteIndex ? 0 : current);
    };

    const restoreRemovedImages = () => {
        if (!removedImages.length) return;
        setFormData(previous => {
            const toRestore = new Set(removedImages);
            const original = originalImages;
            const restored = original.filter(url => previous.images.includes(url) || toRestore.has(url));
            const other = previous.images.filter(url => !original.includes(url));
            return { ...previous, images: [...restored, ...other] };
        });
        setRemovedImages([]);
        setCoverImageIndex(initialCoverIndex);
    };

    // ── Stock handler ─────────────────────────────────────────────────────────
    const handleStockChange = (variantId, value) => {
        if (!String(variantId).startsWith('temp_')) return;
        setChangedStocks(prev => ({ ...prev, [variantId]: true }));
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
                            ...(variant.tax || {}),
                            taxable: Boolean(value)
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
        setChangedStocks(previous => ({ ...previous, [variantId]: true }));
    };

    const getDisplayStock = variant => variant?._tempId
        ? (variant.stock ?? 0)
        : (variant?.inventory?.stock ?? variant?.stock ?? 0);

    const openStockAdjustment = (variant, event) => {
        if (isBusy) return;
        stockReturnFocusRef.current = event?.currentTarget || null;
        setAdjustingVariantId(variant?._id?.toString() || null);
        setAdjustQuantity('');
        setAdjustNote('');
    };

    const handleAdjustExistingStock = async event => {
        event.preventDefault();
        const variantId = adjustingVariantId;
        const variant = formData.variants.find(item => String(item._id) === variantId);
        const quantity = Number(adjustQuantity);
        const currentStock = Number(variant?.inventory?.stock ?? variant?.stock ?? 0);
        if (!variant) return;
        if (!Number.isSafeInteger(quantity) || quantity === 0 || currentStock + quantity < 0) {
            toast.error('Enter a non-zero whole number. Stock cannot become negative.');
            return;
        }
        stockIdempotencyCounterRef.current += 1;
        const nonce = window.crypto?.randomUUID?.() || `${Date.now()}-${stockIdempotencyCounterRef.current}`;
        const idempotencyKey = `stock-adjust:${id}:${variantId}:${nonce}`;
        setStockSubmittingId(variantId);
        try {
            const { data } = await API.patch('/admin/inventory/stock', {
                productId: id,
                variantId,
                mode: 'adjust',
                quantity,
                reason: quantity > 0 ? 'restock' : 'manual_reduction',
                note: adjustNote.trim() || 'Adjusted from product edit variant table',
                idempotencyKey
            });
            const afterStock = Number(data?.data?.afterStock);
            if (Number.isFinite(afterStock)) {
                setFormData(previous => ({
                    ...previous,
                    variants: previous.variants.map(item => String(item._id) === variantId
                        ? { ...item, stock: afterStock, inventory: { ...(item.inventory || {}), stock: afterStock } }
                        : item)
                }));
            }
            setAdjustingVariantId(null);
            toast.success(data?.message || 'Inventory updated. Stock movement recorded.');
        } catch (error) {
            toast.error(readableError(error));
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
        if (isBusy) return;
        const confirmation = variantId.startsWith('temp_')
            ? 'Discard this unsaved new variant?'
            : 'Remove this variant now? This is saved immediately, separate from other product edits.';
        if (!window.confirm(confirmation)) return;

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

        // Existing variant deletion is an immediate server mutation, not part of Save changes.
        setActionPending(variantId);
        try {
            await API.patch(`/admin/products/${encodeURIComponent(id)}`, { removeVariants: [variantId] });
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
            toast.error(readableError(err));
        } finally {
            setActionPending('');
        }
    };

    // ── Add single option (Immediate API Call) ────────────────────────────────
    const handleAddOption = async () => {
        if (isBusy) return;
        if (Object.keys(changedStocks).length > 0) {
            toast.error('Save your pending variant edits before generating new combinations.');
            return;
        }
        if (!addOptionForm.name.trim() || !addOptionForm.option.trim()) {
            toast.error('Attribute name and option value are required');
            return;
        }
        const optionStock = Number(addOptionForm.defaultStock);
        if (!Number.isSafeInteger(optionStock) || optionStock < 0) {
            toast.error('Default stock must be a non-negative whole number.');
            return;
        }
        setIsAddingOption(true);
        try {
            const res = await API.patch(`/admin/products/${encodeURIComponent(id)}`, {
                addAttributeOption: {
                    name:         addOptionForm.name.trim().toLowerCase(),
                    option:       addOptionForm.option.trim().toLowerCase(),
                    defaultStock: Number(addOptionForm.defaultStock)
                }
            });
            const updated = res.data.data;
            if (Array.isArray(updated?.variants)) {
                setFormData(previous => ({ ...previous, variants: updated.variants.map(normalizeVariantForEdit) }));
            }
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
        setNewVariantForm(previous => ({
            ...previous,
            attributes: previous.attributes.map((item, position) =>
                position === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleAddCustomVariant = () => {
        // Reject incomplete entries instead of silently throwing them away.
        if (newVariantForm.attributes.some(a => !a.name.trim() || !a.value.trim())) {
            toast.error('Complete every attribute name and value, or remove the unfinished row.');
            return;
        }
        const validAttrs = newVariantForm.attributes;
        if (validAttrs.length === 0) {
            toast.error("Add at least one complete attribute (e.g., color: blue)");
            return;
        }

        if (new Set(validAttrs.map(a => a.name.trim().toLowerCase())).size !== validAttrs.length) {
            toast.error('Each attribute name can appear only once in a variant.');
            return;
        }
        const initialStock = Number(newVariantForm.stock);
        if (!Number.isSafeInteger(initialStock) || initialStock < 0) {
            toast.error('Initial stock must be a non-negative whole number.');
            return;
        }
        if (formData.variants.some(v => variantKey(v) === variantKey({ attributes: validAttrs }))) {
            toast.error('A variant with those attributes already exists.');
            return;
        }
        tempVariantCounterRef.current += 1;
        const tempId = `temp_${Date.now()}_${tempVariantCounterRef.current}`;
        const newVariant = {
            _tempId: tempId,
            attributes: validAttrs.map(a => ({
                name: a.name.trim().toLowerCase(),
                value: a.value.trim().toLowerCase()
            })),
            stock: initialStock,
            isActive: true
        };

        // Append to local variants array
        setFormData(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));

        // Mark as changed so it gets bundled into the update payload
        setChangedStocks(prev => ({ ...prev, [tempId]: true }));

        // Reset the form
        setNewVariantForm({ attributes: [{ name: '', value: '' }], stock: 0 });
        setShowAddVariant(false);
        toast.success("Variant added locally! Click 'Update Product' to save it.");
    };

    // ── KV handlers ───────────────────────────────────────────────────────────
    const handleKVChange = (type, index, field, value) => {
        setFormData(previous => ({
            ...previous,
            [type]: previous[type].map((item, position) =>
                position === index ? { ...item, [field]: value } : item
            )
        }));
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
        { id: 'stock', label: 'Stock is available', done: totalStock > 0, helper: 'Keep stock updated to avoid cancelled orders.' },
        { label: 'Description helps shoppers', done: formData.description.trim().length >= 20, helper: 'Explain material, use case, or key benefit.' },
        { id: 'publication', label: 'Product is published', done: formData.status === 'Published', helper: 'Draft products stay hidden from shoppers.' }
    ];

    const getAiVariants = () => formData.variants.map(variant => ({
        attributes: variant.attributes || [],
        stock: Number(getDisplayStock(variant) || 0),
        priceOverride: Number(variant.pricing?.price || variant.priceOverride || formData.pricing.sellingPrice || 0)
    }));

    const getAiImages = () => {
        const images = [...(formData.images || []), ...newImageFiles];
        const cover = images[coverImageIndex];
        const ordered = [cover, ...images.filter((_, index) => index !== coverImageIndex)];
        if (!ordered.some(Boolean)) ordered.push(formData.variants?.find(variant => variant.image)?.image);
        return ordered.filter(Boolean);
    };

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
    const handleSubmit = async event => {
        event.preventDefault();
        if (isBusy) return;
        if (!formData.title.trim() || !formData.description.trim()) {
            toast.error('A product title and description are required.');
            return;
        }
        const price = Number(formData.pricing.sellingPrice);
        const cost = Number(formData.pricing.buyingPrice);
        const discountRate = Number(formData.pricing.discount);
        if (![price, cost, discountRate].every(Number.isFinite) || price < 0 || cost < 0 || discountRate < 0 || discountRate > 100) {
            toast.error('Check pricing: amounts must be non-negative, and discount must be from 0 to 100%.');
            return;
        }
        if (!Number.isSafeInteger(Number(formData.lowStockThreshold)) || Number(formData.lowStockThreshold) < 0) {
            toast.error('Low-stock threshold must be a non-negative whole number.');
            return;
        }
        if (formData.publicationStatus === 'scheduled') {
            const when = new Date(formData.publishAt);
            if (!canSchedulePublishing || !formData.publishAt || Number.isNaN(when.getTime())) {
                toast.error('Choose a valid scheduled publish time and check your plan access.');
                return;
            }
        }
        if (hasIncompleteSellingPoint(formData.features)) {
            toast.error('Each selling point needs both a point and why it matters.');
            return;
        }
        if (hasIncompleteKeyValueRow(formData.specifications) || hasIncompleteKeyValueRow(formData.comments)) {
            toast.error('Each detail row needs both a title and value.');
            return;
        }
        if ((formData.images.length + newImageFiles.length) > imageLimit && newImageFiles.length > 0) {
            toast.error(`Your plan allows up to ${imageLimit} images. Remove excess images before uploading.`);
            return;
        }
        for (const variant of formData.variants.filter(v => v._tempId)) {
            if (!Number.isSafeInteger(Number(variant.stock)) || Number(variant.stock) < 0) {
                toast.error('New variant stock must be a non-negative whole number.');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const body = new FormData();
            body.append('title', formData.title.trim());
            if (formData.slug) body.append('slug', formData.slug.trim());
            body.append('description', formData.description);
            body.append('category', formData.category);
            body.append('tags', JSON.stringify(formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)));
            body.append('status', formData.status);
            body.append('publicationStatus', formData.publicationStatus);
            if (formData.publicationStatus === 'scheduled') body.append('publishAt', new Date(formData.publishAt).toISOString());
            body.append('lowStockThreshold', String(formData.lowStockThreshold ?? 5));
            body.append('imageAltText', formData.imageAltText);
            body.append('seo', JSON.stringify(formData.seo));
            body.append('pricing', JSON.stringify({ buyingPrice: cost, sellingPrice: price, discount: discountRate }));
            body.append('features', JSON.stringify(normalizeSellingPointRows(formData.features)));
            body.append('specifications', JSON.stringify(normalizeKeyValueRows(formData.specifications)));
            body.append('comments', JSON.stringify(normalizeKeyValueRows(formData.comments)));
            body.append('sellerFacts', JSON.stringify(formData.sellerFacts));
            body.append('existingImages', JSON.stringify(formData.images || []));
            body.append('removedImages', JSON.stringify(removedImages));
            body.append('coverImageIndex', JSON.stringify(coverImageIndex));
            newImageFiles.forEach(file => body.append('images', file));

            // Existing stock is NEVER sent through this endpoint: inventory has its own audited route.
            if (Object.keys(changedStocks).length > 0) {
                const variantsPayload = formData.variants
                    .filter(variant => changedStocks[variant._id?.toString() || variant._tempId] !== undefined)
                    .map(variant => {
                        const isExisting = Boolean(variant._id);
                        const inventory = { ...(variant.inventory || {}) };
                        if (isExisting) delete inventory.stock;
                        else inventory.stock = Number(variant.stock);
                        const payload = {
                            attributes: variant.attributes,
                            priceOverride: variant.pricing?.price ?? variant.priceOverride,
                            pricing: variant.pricing,
                            inventory,
                            image: variant.image,
                            sku: variant.sku,
                            barcode: variant.barcode,
                            weight: variant.weight,
                            dimensions: variant.dimensions,
                            status: variant.status || (variant.isActive === false ? 'draft' : 'active'),
                            tax: variant.tax,
                            isActive: variant.isActive !== undefined ? variant.isActive : true
                        };
                        if (isExisting) payload._id = variant._id;
                        else payload.stock = Number(variant.stock);
                        return payload;
                    });
                if (variantsPayload.length > 0) body.append('variants', JSON.stringify(variantsPayload));
            }

            // The PATCH response is sufficient for success; a failed follow-up GET must not
            // turn an already committed edit into a misleading 'update failed' message.
            await API.patch(`/admin/products/${encodeURIComponent(id)}`, body);
            toast.success(formData.status === 'Draft' ? 'Product saved as draft.' : 'Product changes saved.');
            navigate('/dashboard/products');
        } catch (error) {
            toast.error(readableError(error));
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
        <div className="mx-auto max-w-[1500px] min-w-0 space-y-5 px-3 pb-28 pt-5 sm:px-5 sm:pt-8">

            {/* Page heading and context */}
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <button type="button" onClick={handleCancel} disabled={isBusy}
                        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-700 disabled:opacity-50">
                    <ArrowLeft size={15} /> Back to products
                </button>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">Catalog editor</span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${formData.publicationStatus === 'scheduled' ? 'bg-violet-50 text-violet-700' : formData.status === 'Published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {formData.publicationStatus === 'scheduled' ? 'Scheduled' : formData.status}
                            </span>
                            {isDirty && <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes</span>}
                        </div>
                        <h1 className="break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Edit product</h1>
                        <p className="mt-1 max-w-2xl break-words text-sm text-slate-500">{formData.title || 'Untitled product'} · Keep details, pricing and inventory accurate for your customers.</p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <button type="button" onClick={handleCancel} disabled={isBusy} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none">Cancel</button>
                        <button type="submit" form="edit-product-form" disabled={isBusy || !isDirty} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSubmitting ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500" aria-label="Jump to product section">
                <span className="mr-1 text-slate-400">Jump to</span>
                {[['Basics', 'edit-basics'], ['SEO', 'edit-seo'], ['Media', 'edit-media'], ['Pricing', 'edit-pricing'], ['Variants', 'edit-variants'], ['More details', 'edit-details']].map(([label, anchor]) => (
                    <a key={anchor} href={`#${anchor}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{label}</a>
                ))}
            </div>

            <form id="edit-product-form" onSubmit={handleSubmit} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-6">

                    {/* ── BASIC ─────────────────────────────────────────────── */}
                    <div id="edit-basics" className="scroll-mt-24" />
                    <ProductFormSection
                        title="1. Product basics"
                        description="Keep the title, category, and description easy for shoppers to understand."
                        icon={PackagePlus}
                    >
                        <SellerHint>Published products are visible to shoppers. Draft products stay hidden until you are ready.</SellerHint>
                        <ProductAiAssistant
                            health={productSeoHealth}
                            readiness={readinessItems} entityId={id}
                            formData={formData}
                            setFormData={setFormData}
                            getImages={getAiImages}
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
                        <SellerFactsEditor value={formData.sellerFacts}
                                           onChange={sellerFacts => setFormData(prev => ({ ...prev, sellerFacts }))} />
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
                                {(canSchedulePublishing || formData.publicationStatus === 'scheduled') && <option>Scheduled</option>}
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

                    <div id="edit-seo" className="scroll-mt-24" />
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

                    <div id="edit-media" className="scroll-mt-24" />
                    <ProductFormSection
                        title="3. Product images"
                        description="Add, remove, or choose the cover image shown on product cards."
                        icon={ImageIcon}
                    >
                        <ImageEmptyState selectedCount={(formData.images?.length || 0) + newImageFiles.length} max={imageLimit} />
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">Add images</label>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                                multiple
                                onChange={(event) => { handleImageFiles(event.target.files); event.target.value = ''; }}
                                className="w-full rounded-lg border bg-gray-50 p-2 text-sm"
                            />
                            <p className="text-xs text-gray-500">
                                Images: {(formData.images?.length || 0) + newImageFiles.length} of {imageLimit} used. Existing over-limit images stay until you remove them, but no new images can be added.
                            </p>
                        </div>

                        {removedImages.length > 0 && (
                            <button type="button" onClick={restoreRemovedImages} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
                                <RotateCcw size={14} /> Restore {removedImages.length} removed image(s) before saving
                            </button>
                        )}
                        {(formData.images?.length > 0 || newImagePreviews.length > 0) && (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {formData.images.map((imageUrl, index) => (
                                    <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                                        {isSafeImageUrl(imageUrl) ? (
                                            <img src={imageUrl} alt={formData.imageAltText || formData.title || `Product image ${index + 1}`} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                                        ) : <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon size={22} /></div>}
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
                                                onClick={() => removeExistingImage(imageUrl, index)}
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
                    <div id="edit-pricing" className="scroll-mt-24" />
                    <ProductFormSection
                        title="4. Pricing"
                        description="Selling price and discount update the live storefront after saving."
                        icon={DollarSign}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input id="buyingPrice"  label="Buying"     type="number" value={formData.pricing.buyingPrice} onChange={handlePricing} />
                            <Input id="sellingPrice" label="Selling"    type="number" value={formData.pricing.sellingPrice} onChange={handlePricing} />
                            <Input id="discount"     label="Discount %" type="number" value={formData.pricing.discount} onChange={handlePricing} />
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
                    <div id="edit-variants" className="scroll-mt-24" />
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

                        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs leading-5 text-blue-800">
                            <strong>Inventory is tracked separately.</strong> Use Adjust to add or subtract stock on saved variants. Variant metadata is saved with Save changes.
                            <span className="mt-1 block text-blue-600 lg:hidden">Swipe the table sideways to see all variant fields.</span>
                        </div>
                        {/* Fast mobile editor; all advanced fields remain available below. */}
                        <div className="space-y-3 lg:hidden">
                            {formData.variants.map(variant => {
                                const vid = String(variant._id || variant._tempId);
                                const newVariant = Boolean(variant._tempId);
                                return (
                                    <div key={vid} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap gap-1 text-sm font-bold text-slate-900">
                                                    {(variant.attributes || []).length ? variant.attributes.map(attribute => `${attribute.name}: ${attribute.value}`).join(' · ') : 'Default variant'}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">{newVariant ? 'New · saved with this product' : 'Existing · stock tracked separately'}</p>
                                            </div>
                                            <button type="button" aria-label={`Remove variant ${vid}`} disabled={isBusy || formData.variants.length <= 1} onClick={() => handleRemoveVariant(vid)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 size={16}/></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="block min-w-0 text-xs font-semibold text-slate-600">SKU
                                                <input value={variant.sku || ''} onChange={event => handleVariantFieldChange(vid, 'sku', event.target.value.toUpperCase())} placeholder="SKU" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                                            </label>
                                            <label className="block min-w-0 text-xs font-semibold text-slate-600">Price override
                                                <input type="number" min="0" value={variant.pricing?.price ?? variant.priceOverride ?? ''} onChange={event => handleVariantFieldChange(vid, 'price', event.target.value)} placeholder={String(formData.pricing.sellingPrice || 0)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                                            </label>
                                            <label className="block min-w-0 text-xs font-semibold text-slate-600">Status
                                                <select value={variant.status || (variant.isActive === false ? 'draft' : 'active')} onChange={event => handleVariantFieldChange(vid, 'status', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                                                    <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
                                                </select>
                                            </label>
                                            <div className="min-w-0 text-xs font-semibold text-slate-600">Stock
                                                {newVariant ? <input aria-label="Initial variant stock" type="number" min="0" value={getDisplayStock(variant)} onChange={event => handleStockChange(vid, event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                                                    : <div className="mt-1.5 flex min-h-10 items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 text-sm"><strong className="text-slate-800">{getDisplayStock(variant)}</strong><button type="button" disabled={isBusy} onClick={event => openStockAdjustment(variant, event)} className="font-semibold text-blue-700 disabled:opacity-50">Adjust</button></div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <button type="button" aria-expanded={showVariantTable} onClick={() => setShowVariantTable(previous => !previous)}
                                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50">
                                {showVariantTable ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} {showVariantTable ? 'Hide' : 'Show'} advanced variant fields
                            </button>
                        </div>
                        {/* Full editor: desktop table / optional advanced settings on mobile. */}
                        <div tabIndex={0} role="region" aria-label="Scrollable variant editor" className={`${showVariantTable ? '' : 'hidden'} lg:block rounded-xl border border-slate-200 bg-white overflow-x-auto shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500`}>
                            <table className="min-w-[1340px] w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wide">
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
                                        <tr key={vid} className={`transition-colors hover:bg-blue-50/30 ${isNew ? 'bg-emerald-50/40' : ''}`}>
                                            <td className="sticky left-0 z-[1] border-r border-slate-100 bg-white px-4 py-2.5 shadow-[4px_0_8px_-8px_rgba(15,23,42,0.2)]">
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
                                                            onClick={(event) => openStockAdjustment(v, event)}
                                                            disabled={isBusy}
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
                                                    disabled={formData.variants.length <= 1 || isBusy}
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
                                {Object.keys(changedStocks).length} pending variant edit(s) — saved when you click "Save changes"
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

                                    <Button type="button" onClick={handleAddOption} isLoading={isAddingOption} disabled={isBusy} className="w-full sm:w-auto">
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
                    <div id="edit-details" className="scroll-mt-24" />
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

                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
                        Review your edits and click <strong>Save changes</strong> below. Stock adjustments and removal of existing variants take effect immediately.
                    </div>
                </div>

                <div className="min-w-0 space-y-4">
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

            <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_15px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:px-5">
                <div className="min-w-0">
                    <p aria-live="polite" className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        {isDirty ? <Clock3 size={16} className="text-amber-500" /> : <Check size={16} className="text-emerald-600" />}
                        {isDirty ? 'You have unsaved changes' : 'No pending changes'}
                    </p>
                    <p className="hidden text-xs text-slate-500 sm:block">Existing stock adjustments save separately.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={handleCancel} disabled={isBusy} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                    <button type="submit" form="edit-product-form" disabled={!isDirty || isBusy}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSubmitting ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>

            {adjustingVariantId && (() => {
                const variant = formData.variants.find(item => String(item._id) === adjustingVariantId);
                const stock = Number(variant?.inventory?.stock ?? variant?.stock ?? 0);
                const quantity = Number(adjustQuantity);
                const nextStock = stock + (Number.isFinite(quantity) ? quantity : 0);
                return (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]" onMouseDown={event => { if (event.target === event.currentTarget && !stockSubmittingId) setAdjustingVariantId(null); }}>
                        <div role="dialog" aria-modal="true" aria-labelledby="edit-stock-heading" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <form onSubmit={handleAdjustExistingStock} className="space-y-5 p-5 sm:p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 id="edit-stock-heading" className="text-lg font-bold text-slate-900">Adjust inventory</h2>
                                        <p className="mt-1 text-sm text-slate-500">Adds an auditable stock movement immediately.</p>
                                    </div>
                                    <button type="button" aria-label="Close stock adjustment" onClick={() => setAdjustingVariantId(null)} disabled={Boolean(stockSubmittingId)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                                    <div><span className="text-slate-500">Current stock</span><p className="mt-1 text-2xl font-bold text-slate-900">{stock}</p></div>
                                    <div><span className="text-slate-500">After adjustment</span><p className={`mt-1 text-2xl font-bold ${nextStock < 0 ? 'text-red-600' : 'text-blue-700'}`}>{nextStock}</p></div>
                                </div>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Adjustment amount
                                    <input ref={stockInputRef} type="number" step="1" required value={adjustQuantity} onChange={event => setAdjustQuantity(event.target.value)} placeholder="e.g. +10 or -2"
                                           className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                                    <span className="mt-1 block text-xs font-normal text-slate-500">Use a positive number to restock, or a negative number to reduce stock.</span>
                                </label>
                                <label className="block text-sm font-semibold text-slate-700">
                                    Note <span className="font-normal text-slate-400">· optional</span>
                                    <input value={adjustNote} maxLength={160} onChange={event => setAdjustNote(event.target.value)} placeholder="Reason for the adjustment"
                                           className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                                </label>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button type="button" disabled={Boolean(stockSubmittingId)} onClick={() => setAdjustingVariantId(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                                    <button type="submit" disabled={Boolean(stockSubmittingId) || !adjustQuantity || !Number.isSafeInteger(quantity) || !quantity || nextStock < 0}
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                                        {stockSubmittingId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Confirm stock movement
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default EditProduct;
