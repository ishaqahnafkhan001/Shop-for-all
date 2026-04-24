import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const EditProduct = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { state } = useLocation();

    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: state?.product?.title || '',
        description: state?.product?.description || '',
        buyingPrice: state?.product?.buyingPrice || '',
        sellingPrice: state?.product?.sellingPrice || '',
        // ✨ NEW: Individual Discount field
        discount: state?.product?.discount || 0,
        category: state?.product?.category || '',
        stock: state?.product?.stock || '',
    });

    useEffect(() => {
        if (!state?.product) {
            navigate('/dashboard/products');
        }
    }, [state, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    // ✨ Logic to show the discounted price in the UI
    const calculateDiscountedPrice = () => {
        const price = Number(formData.sellingPrice) || 0;
        const disc = Number(formData.discount) || 0;
        return Math.round(price - (price * disc / 100));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await API.patch(`/admin/products/${id}`, {
                ...formData,
                buyingPrice: Number(formData.buyingPrice),
                sellingPrice: Number(formData.sellingPrice),
                discount: Number(formData.discount), // ✨ Send discount to backend
                stock: Number(formData.stock)
            });

            toast.success("Product updated successfully!");
            navigate('/dashboard/products');
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update product");
        } finally {
            setIsLoading(false);
        }
    };

    const discountedPrice = calculateDiscountedPrice();
    const profit = discountedPrice - (Number(formData.buyingPrice) || 0);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input id="title" label="Product Title" value={formData.title} onChange={handleChange} required />

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input
                            id="buyingPrice"
                            label="Buying Price (৳)"
                            type="number"
                            value={formData.buyingPrice}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            id="sellingPrice"
                            label="Retail Price (৳)"
                            type="number"
                            value={formData.sellingPrice}
                            onChange={handleChange}
                            required
                        />
                        {/* ✨ NEW: Discount Input Field ✨ */}
                        <Input
                            id="discount"
                            label="Discount (%)"
                            type="number"
                            value={formData.discount}
                            onChange={handleChange}
                            min="0"
                            max="100"
                        />
                    </div>

                    {/* ✨ NEW: Smart Price & Profit Preview ✨ */}
                    {formData.sellingPrice !== '' && (
                        <div className={`p-4 border rounded-xl space-y-2 ${profit > 0 ? 'bg-indigo-50/50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Final Sale Price:</span>
                                <span className="font-bold text-indigo-700">৳{discountedPrice}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Actual Profit:</span>
                                <span className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ৳{profit} {profit <= 0 && '(Loss!)'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input id="stock" label="Stock Quantity" type="number" value={formData.stock} onChange={handleChange} required />
                        <Input id="category" label="Category" value={formData.category} onChange={handleChange} required />
                    </div>

                    <div className="pt-4">
                        <Button type="submit" isLoading={isLoading}>Update Product</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProduct;