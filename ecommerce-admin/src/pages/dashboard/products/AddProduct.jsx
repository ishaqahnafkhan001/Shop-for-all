import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Image as ImageIcon, Video } from 'lucide-react'; // Added icons for UI
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const AddProduct = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // 1️⃣ ADDED: State for actual file objects
    const [imageFiles, setImageFiles] = useState([]);
    const [videoFiles, setVideoFiles] = useState([]);

    // Removed the dummy 'images' string array from here
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        pricing: { buyingPrice: '', sellingPrice: '', discount: 0 },
        variants: [{ attributes: [{ name: 'color', value: 'white' }], stock: 0 }],
        features: [],
        specifications: [],
        comments: []
    });

    // --- State Handlers (Unchanged) ---
    const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });
    const handlePricing = (e) => setFormData({ ...formData, pricing: { ...formData.pricing, [e.target.id]: Number(e.target.value) } });

    const handleVariantChange = (i, field, value) => {
        const updated = [...formData.variants];
        updated[i][field] = value;
        setFormData({ ...formData, variants: updated });
    };
    const handleAttributeChange = (v, a, field, value) => {
        const updated = [...formData.variants];
        updated[v].attributes[a][field] = value;
        setFormData({ ...formData, variants: updated });
    };
    const addVariant = () => setFormData({ ...formData, variants: [...formData.variants, { attributes: [{ name: '', value: '' }], stock: 0 }] });
    const removeVariant = (i) => setFormData({ ...formData, variants: formData.variants.filter((_, index) => index !== i) });

    const handleKVChange = (type, index, field, value) => {
        const updated = [...formData[type]];
        updated[index][field] = value;
        setFormData({ ...formData, [type]: updated });
    };
    const addKV = (type) => setFormData({ ...formData, [type]: [...formData[type], { title: '', value: '' }] });
    const removeKV = (type, index) => setFormData({ ...formData, [type]: formData[type].filter((_, i) => i !== index) });

    const finalPrice = formData.pricing.sellingPrice - (formData.pricing.sellingPrice * formData.pricing.discount) / 100;
    const profit = (finalPrice || 0) - (Number(formData.pricing.buyingPrice) || 0);

    // 2️⃣ UPDATED: Submit handler using FormData
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Create a new FormData instance
            const data = new FormData();

            // Append basic strings
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('category', formData.category);

            // Append nested objects as JSON strings (required for multipart/form-data)
            data.append('pricing', JSON.stringify(formData.pricing));
            data.append('variants', JSON.stringify(formData.variants));
            data.append('features', JSON.stringify(formData.features));
            data.append('specifications', JSON.stringify(formData.specifications));
            data.append('comments', JSON.stringify(formData.comments));

            // Append Images (matches upload.fields name: 'images')
            imageFiles.forEach((file) => {
                data.append('images', file);
            });

            // Append Videos (matches upload.fields name: 'videos')
            videoFiles.forEach((file) => {
                data.append('videos', file);
            });

            // Send to backend with correct Content-Type headers
            await API.post('/admin/products', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success("Product added successfully!");
            navigate('/dashboard/products');
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add product");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold">Add Product</h1>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* BASIC */}
                <div className="bg-white p-5 rounded-xl border space-y-4">
                    <Input id="title" label="Title" value={formData.title} onChange={handleChange} required />
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        placeholder="Description"
                        required
                    />
                    <Input id="category" label="Category" value={formData.category} onChange={handleChange} />
                </div>

                {/* 3️⃣ ADDED: MEDIA UPLOAD SECTION */}
                <div className="bg-white p-5 rounded-xl border space-y-4">
                    <h2 className="font-semibold flex items-center"><ImageIcon size={18} className="mr-2"/> Media</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Image Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Images (Max 5)</label>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                multiple
                                onChange={(e) => setImageFiles(Array.from(e.target.files))}
                                className="w-full border rounded p-2 text-sm"
                            />
                            {imageFiles.length > 0 && (
                                <p className="text-xs text-indigo-600">{imageFiles.length} image(s) selected</p>
                            )}
                        </div>

                        {/* Video Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <Video size={16} className="mr-1"/> Videos (Max 2)
                            </label>
                            <input
                                type="file"
                                accept="video/mp4, video/quicktime, video/webm"
                                multiple
                                onChange={(e) => setVideoFiles(Array.from(e.target.files))}
                                className="w-full border rounded p-2 text-sm"
                            />
                            {videoFiles.length > 0 && (
                                <p className="text-xs text-indigo-600">{videoFiles.length} video(s) selected</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* PRICING */}
                <div className="bg-white p-5 rounded-xl border space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="buyingPrice" label="Buying" type="number" onChange={handlePricing} required/>
                        <Input id="sellingPrice" label="Selling" type="number" onChange={handlePricing} required/>
                        <Input id="discount" label="Discount %" type="number" onChange={handlePricing} />
                    </div>

                    <div className={`p-4 rounded-lg border space-y-2 ${
                        profit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Final Price:</span>
                            <span className="font-bold text-indigo-600">৳ {Math.round(finalPrice || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Estimated Profit:</span>
                            <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ৳ {profit} {profit < 0 && '(Loss!)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* VARIANTS (Unchanged) */}
                <div className="bg-white p-5 rounded-xl border space-y-4">
                    <div className="flex justify-between">
                        <h2 className="font-semibold">Variants</h2>
                        <button type="button" onClick={addVariant} className="text-indigo-600 text-sm flex items-center">
                            <Plus size={14} className="mr-1" /> Add
                        </button>
                    </div>

                    {formData.variants.map((v, i) => (
                        <div key={i} className="border p-3 rounded relative space-y-2">
                            {formData.variants.length > 1 && (
                                <button onClick={() => removeVariant(i)} type="button" className="absolute top-2 right-2 text-red-500">
                                    <Trash2 size={14} />
                                </button>
                            )}
                            {v.attributes.map((a, ai) => (
                                <div key={ai} className="grid grid-cols-2 gap-2">
                                    <input
                                        className="border rounded p-1"
                                        value={a.name}
                                        placeholder="Attribute (e.g. Size)"
                                        onChange={(e) => handleAttributeChange(i, ai, 'name', e.target.value)}
                                    />
                                    <input
                                        className="border rounded p-1"
                                        value={a.value}
                                        placeholder="Value (e.g. XL)"
                                        onChange={(e) => handleAttributeChange(i, ai, 'value', e.target.value)}
                                    />
                                </div>
                            ))}
                            <Input
                                label="Stock"
                                type="number"
                                value={v.stock}
                                onChange={(e) => handleVariantChange(i, 'stock', Number(e.target.value))}
                            />
                        </div>
                    ))}
                </div>

                {/* DYNAMIC KV SECTION (Unchanged) */}
                {['features', 'specifications', 'comments'].map((type) => (
                    <div key={type} className="bg-white p-5 rounded-xl border space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="font-semibold capitalize">{type}</h2>
                            <button type="button" onClick={() => addKV(type)} className="text-indigo-600 text-sm flex items-center">
                                <Plus size={14} className="mr-1" /> Add
                            </button>
                        </div>

                        {formData[type].map((item, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2 relative">
                                <input
                                    className="border rounded p-2 text-sm"
                                    placeholder="Title"
                                    value={item.title}
                                    onChange={(e) => handleKVChange(type, index, 'title', e.target.value)}
                                />
                                <input
                                    className="border rounded p-2 text-sm"
                                    placeholder="Value"
                                    value={item.value}
                                    onChange={(e) => handleKVChange(type, index, 'value', e.target.value)}
                                />
                                <button type="button" onClick={() => removeKV(type, index)} className="absolute right-0 top-2 text-red-500 bg-white px-1">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ))}

                <Button type="submit" isLoading={isLoading}>
                    Save Product
                </Button>

            </form>
        </div>
    );
};

export default AddProduct;