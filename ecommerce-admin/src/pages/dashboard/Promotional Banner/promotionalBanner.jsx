import { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon, Loader2, RefreshCcw, Layers, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Make sure this path correctly points to your custom Axios instance file
import API from '../../../api/api.js';

const PromotionalBanner = () => {
    // State Management
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [link, setLink] = useState('');
    const [type, setType] = useState('standard');
    const [scheduledProduct, setScheduledProduct] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [productOptions, setProductOptions] = useState([]);
    const [productLoading, setProductLoading] = useState(false);
    const [countdownEnabled, setCountdownEnabled] = useState(true);
    const [postLaunchBehavior, setPostLaunchBehavior] = useState('convert_to_product');
    const [postLaunchCtaText, setPostLaunchCtaText] = useState('View product');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [desktopImages, setDesktopImages] = useState([]);
    const [mobileImages, setMobileImages] = useState([]);

    // 1. Fetch Banners on Component Load
    const fetchBanners = async () => {
        setLoading(true);
        try {
            const res = await API.get('/banners');
            const bannerData = Array.isArray(res.data) ? res.data : res.data.data;
            setBanners(bannerData || []);
        } catch (err) {
            console.error("Error fetching banners:", err);
            setBanners([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchBanners, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (type !== 'scheduled_product') return undefined;

        let cancelled = false;
        const timer = setTimeout(async () => {
            setProductLoading(true);
            try {
                const { data } = await API.get('/admin/products', {
                    params: {
                        search: productSearch || undefined,
                        status: 'Draft',
                        page: 1,
                        limit: 8,
                        sort: 'nameAsc'
                    }
                });
                if (!cancelled) {
                    setProductOptions((data.data || []).filter(product => product.publicationStatus === 'scheduled'));
                }
            } catch {
                if (!cancelled) setProductOptions([]);
            } finally {
                if (!cancelled) setProductLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [productSearch, type]);

    // 2. Handle File Selection (Multiple Files)
    const handleFileChange = (e, target) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);

            if (selectedFiles.length > 5) {
                toast.error("You can upload a maximum of 5 banner images.");
            }

            const nextFiles = selectedFiles.slice(0, 5);
            if (target === 'mobile') setMobileImages(nextFiles);
            else setDesktopImages(nextFiles);
        }
    };

    // 3. Handle Form Submission (Upload)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (desktopImages.length === 0) {
            toast.error("Select at least one desktop banner image before uploading.");
            return;
        }
        if (type === 'scheduled_product') {
            if (!scheduledProduct?._id) {
                toast.error("Select a scheduled product for this launch banner.");
                return;
            }
            if (mobileImages.length === 0) {
                toast.error("Select a mobile banner image for launch countdown banners.");
                return;
            }
            if (!startsAt) {
                toast.error("Set when the launch banner should start showing.");
                return;
            }
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('subtitle', subtitle);
        formData.append('link', link);
        formData.append('type', type);
        if (type === 'scheduled_product') {
            formData.append('scheduledProduct', scheduledProduct._id);
            formData.append('countdownEnabled', countdownEnabled ? 'true' : 'false');
            formData.append('postLaunchBehavior', postLaunchBehavior);
            formData.append('postLaunchCtaText', postLaunchCtaText);
        }
        if (startsAt) formData.append('startsAt', startsAt);
        if (endsAt) formData.append('endsAt', endsAt);

        desktopImages.forEach((file) => {
            formData.append('desktopImages', file);
        });

        mobileImages.forEach((file) => {
            formData.append('mobileImages', file);
        });

        try {
            await API.post('/banners', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Reset Form Fields after successful upload
            setTitle('');
            setSubtitle('');
            setLink('');
            setType('standard');
            setScheduledProduct(null);
            setProductSearch('');
            setProductOptions([]);
            setCountdownEnabled(true);
            setPostLaunchBehavior('convert_to_product');
            setPostLaunchCtaText('View product');
            setStartsAt('');
            setEndsAt('');
            setDesktopImages([]);
            setMobileImages([]);

            // Refresh the banner list
            fetchBanners();
            toast.success("Banner uploaded and added to your storefront.");
        } catch (err) {
            console.error("Upload error:", err);
            toast.error("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    // 4. Handle Delete Banner
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this banner? It will disappear from your storefront.")) return;

        try {
            await API.delete(`/banners/${id}`);
            setBanners(prev => prev.filter(b => b._id !== id));
            toast.success("Banner deleted from storefront.");
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete banner.");
        }
    };

    // 5. Handle Toggle Banner Status (Active/Inactive)
    const handleToggleStatus = async (id) => {
        try {
            const res = await API.patch(`/banners/${id}/toggle`);
            const updatedBanner = res.data.data || res.data;
            setBanners(prev => prev.map(b => b._id === id ? updatedBanner : b));
            toast.success(updatedBanner.isActive ? "Banner is now visible on your storefront." : "Banner is now hidden from your storefront.");
        } catch (err) {
            console.error("Toggle error:", err);
            toast.error("Failed to update banner status.");
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Promotional Banners</h1>
                <p className="text-gray-500 text-sm">Banners appear near the top of your storefront. Use clear campaign images and link them to products or collections.</p>
            </div>

            {/* Upload Form Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Banner Type
                            <select
                                value={type}
                                onChange={(e) => {
                                    setType(e.target.value);
                                    setScheduledProduct(null);
                                }}
                                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            >
                                <option value="standard">Normal promotional banner</option>
                                <option value="scheduled_product">Scheduled product launch banner</option>
                            </select>
                        </label>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (Optional)</label>
                            <input
                                type="text"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                placeholder="Short campaign line"
                            />
                        </div>
                    </div>

                    {type === 'scheduled_product' && (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                            <div>
                                <p className="text-sm font-bold text-gray-900">Promote an upcoming product</p>
                                <p className="text-xs text-gray-500">Only products scheduled for future publication are shown. The storefront will show a countdown before launch and unlock the product link after it is public.</p>
                            </div>
                            <label className="relative block">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Search scheduled products"
                                />
                            </label>
                            {scheduledProduct && (
                                <div className="rounded-lg border border-indigo-200 bg-white p-3 text-sm">
                                    <span className="font-bold text-gray-900">{scheduledProduct.title}</span>
                                    <span className="ml-2 text-xs font-semibold text-gray-500">
                                        launches {scheduledProduct.publishAt ? new Date(scheduledProduct.publishAt).toLocaleString() : 'at scheduled time'}
                                    </span>
                                </div>
                            )}
                            <div className="max-h-52 space-y-2 overflow-y-auto">
                                {productLoading ? (
                                    <p className="rounded-lg bg-white p-3 text-sm text-gray-500">Loading scheduled products...</p>
                                ) : productOptions.length === 0 ? (
                                    <p className="rounded-lg bg-white p-3 text-sm text-gray-500">No scheduled products found.</p>
                                ) : productOptions.map(product => (
                                    <button
                                        key={product._id}
                                        type="button"
                                        onClick={() => setScheduledProduct(product)}
                                        className={`flex w-full items-center gap-3 rounded-lg border bg-white p-2 text-left transition ${
                                            scheduledProduct?._id === product._id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-200'
                                        }`}
                                    >
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                            {(product.coverMediaId || product.images?.[0]) && (
                                                <img src={product.coverMediaId || product.images[0]} alt="" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-gray-900">{product.title}</p>
                                            <p className="text-xs text-gray-500">
                                                {product.publishAt ? `Publishes ${new Date(product.publishAt).toLocaleString()}` : 'Scheduled'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={countdownEnabled}
                                        onChange={(e) => setCountdownEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    Show countdown
                                </label>
                                <input
                                    value={postLaunchCtaText}
                                    onChange={(e) => setPostLaunchCtaText(e.target.value)}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                    placeholder="Post-launch button text"
                                />
                            </div>
                            <label className="block text-sm font-medium text-gray-700">
                                After product launches
                                <select
                                    value={postLaunchBehavior}
                                    onChange={(e) => setPostLaunchBehavior(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="convert_to_product">Convert to normal product banner</option>
                                    <option value="hide_on_publish">Hide immediately after publication</option>
                                    <option value="keep_until_end">Remain visible until end time</option>
                                </select>
                            </label>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Title Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                placeholder="e.g., Eid Sale 2026"
                                title="Internal label for this banner campaign"
                                required
                            />
                        </div>

                        {/* Link Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Redirect Link (Optional)</label>
                            <input
                                type="text"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                placeholder="e.g., /products or /collections/eid-sale"
                                title="Where shoppers go after clicking the banner"
                                disabled={type === 'scheduled_product'}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Show from
                            <input
                                type="datetime-local"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                            Show until
                            <input
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Desktop Banner Images (Required)</label>
                            <p className="text-xs text-gray-500 mb-2">Use landscape images. Recommended size: 1600 x 600 px. These show on laptop and big screens.</p>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">
                                    {desktopImages.length > 0 ? (
                                        <span className="text-indigo-600 font-semibold">{desktopImages.length} desktop file(s) selected</span>
                                    ) : (
                                        "Click to select desktop images"
                                    )}
                                </p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                onChange={(event) => handleFileChange(event, 'desktop')}
                                accept="image/*"
                                multiple
                            />
                        </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Banner Images{type === 'scheduled_product' ? ' (Required)' : ''}</label>
                            <p className="text-xs text-gray-500 mb-2">Use portrait images. Recommended size: 900 x 1200 px. These show on mobile only.</p>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">
                                        {mobileImages.length > 0 ? (
                                            <span className="text-indigo-600 font-semibold">{mobileImages.length} mobile file(s) selected</span>
                                        ) : (
                                            "Click to select mobile images"
                                        )}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(event) => handleFileChange(event, 'mobile')}
                                    accept="image/*"
                                    multiple
                                />
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={uploading}
                        className="flex items-center justify-center w-full md:w-max px-8 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-all"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-5 w-5" />
                                Upload Banner
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Banner Grid Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Current Banners</h2>

                {/* Loading State */}
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.isArray(banners) && banners.map((banner) => (
                            <div key={banner._id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">

                                {/* Image Preview (Shows the first image in the array as cover) */}
                                <div className="aspect-video w-full bg-gray-100 overflow-hidden relative border-b border-gray-100">
                                    {(banner.desktopImages?.length > 0 || banner.images?.length > 0) ? (
                                        <>
                                            <img
                                                src={banner.desktopImages?.[0] || banner.images[0]}
                                                alt={banner.title}
                                                className={`w-full h-full object-cover transition-all duration-300 ${!banner.isActive ? 'opacity-50 grayscale' : ''}`}
                                            />
                                            {/* Badge showing multiple images exist */}
                                            {(banner.desktopImages?.length || banner.images?.length || 0) > 1 && (
                                                <div className="absolute top-2 right-2 bg-gray-900/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center shadow">
                                                    <Layers className="w-3 h-3 mr-1" />
                                                    {banner.desktopImages?.length || banner.images?.length}
                                                </div>
                                            )}
                                            {banner.mobileImages?.length > 0 && (
                                                <div className="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md shadow">
                                                    Mobile ready
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full">
                                            <ImageIcon className="text-gray-300 w-10 h-10" />
                                        </div>
                                    )}
                                </div>

                                {/* Banner Details & Controls */}
                                <div className="p-4 flex items-center justify-between flex-1">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="font-bold text-gray-800 truncate" title={banner.title}>
                                            {banner.title}
                                        </h3>
                                        <div className="flex items-center mt-1.5">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                                banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            {banner.type === 'scheduled_product' && (
                                                <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                                    Launch
                                                </span>
                                            )}
                                        </div>
                                        {banner.type === 'scheduled_product' && banner.scheduledProduct && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                {banner.scheduledProduct.title} · {banner.scheduledProduct.publishAt ? new Date(banner.scheduledProduct.publishAt).toLocaleString() : 'scheduled'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleToggleStatus(banner._id)}
                                            className={`p-2 rounded-lg transition-colors ${
                                                banner.isActive
                                                    ? 'text-amber-500 hover:bg-amber-50'
                                                    : 'text-indigo-500 hover:bg-indigo-50'
                                            }`}
                                            title={banner.isActive ? "Hide this banner from the storefront" : "Show this banner on the storefront"}
                                        >
                                            <RefreshCcw className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(banner._id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete this banner permanently"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && Array.isArray(banners) && banners.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-sm font-semibold text-gray-900">No storefront banners yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Upload one campaign banner with a clear offer and a link to the right products.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionalBanner;
