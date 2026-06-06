import { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon, Loader2, RefreshCcw, Layers } from 'lucide-react';
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
    const [link, setLink] = useState('');
    const [images, setImages] = useState([]); // Changed to Array

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

    // 2. Handle File Selection (Multiple Files)
    const handleFileChange = (e) => {
        if (e.target.files) {
            // Convert FileList to an array.
            // Optional: You can slice it if you want to strictly enforce the limit on the frontend
            const selectedFiles = Array.from(e.target.files);

            if (selectedFiles.length > 5) {
                toast.error("You can upload a maximum of 5 banner images.");
                setImages(selectedFiles.slice(0, 5));
            } else {
                setImages(selectedFiles);
            }
        }
    };

    // 3. Handle Form Submission (Upload)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (images.length === 0) {
            toast.error("Select at least one banner image before uploading.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('link', link);

        // Loop through the selected files and append them to formData using the key 'images'
        images.forEach((file) => {
            formData.append('images', file);
        });

        try {
            await API.post('/banners', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Reset Form Fields after successful upload
            setTitle('');
            setLink('');
            setImages([]);

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
                            />
                        </div>
                    </div>

                    {/* Multiple Image File Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Banner Images (Max 5)</label>
                        <p className="text-xs text-gray-500 mb-2">Recommended: wide images around 1600x600 so the banner looks sharp on desktop and mobile.</p>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">
                                        {images.length > 0 ? (
                                            <span className="text-indigo-600 font-semibold">{images.length} file(s) selected</span>
                                        ) : (
                                            "Click to select banner images"
                                        )}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    multiple // Added multiple attribute here
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
                                    {banner.images && banner.images.length > 0 ? (
                                        <>
                                            <img
                                                src={banner.images[0]}
                                                alt={banner.title}
                                                className={`w-full h-full object-cover transition-all duration-300 ${!banner.isActive ? 'opacity-50 grayscale' : ''}`}
                                            />
                                            {/* Badge showing multiple images exist */}
                                            {banner.images.length > 1 && (
                                                <div className="absolute top-2 right-2 bg-gray-900/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center shadow">
                                                    <Layers className="w-3 h-3 mr-1" />
                                                    {banner.images.length}
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
                                        </div>
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
