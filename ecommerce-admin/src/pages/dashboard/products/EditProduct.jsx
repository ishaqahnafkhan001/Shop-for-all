import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const EditProduct = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Get the product ID from the URL
    const { state } = useLocation(); // Get the product data passed from ProductList

    const [isLoading, setIsLoading] = useState(false);

    // Pre-fill the form with the passed data (Updated to use new price fields)
    const [formData, setFormData] = useState({
        title: state?.product?.title || '',
        description: state?.product?.description || '',
        buyingPrice: state?.product?.buyingPrice || '',
        sellingPrice: state?.product?.sellingPrice || '',
        category: state?.product?.category || '',
        stock: state?.product?.stock || '',
    });

    // If the user refreshes the page, the state is lost. Send them back to the list.
    useEffect(() => {
        if (!state?.product) {
            navigate('/dashboard/products');
        }
    }, [state, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Send a PATCH request to update the product with the new price fields
            await API.patch(`/admin/products/${id}`, {
                ...formData,
                buyingPrice: Number(formData.buyingPrice),
                sellingPrice: Number(formData.sellingPrice),
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

    // Calculate profit dynamically for the UI
    const profit = (Number(formData.sellingPrice) || 0) - (Number(formData.buyingPrice) || 0);

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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500"
                            required
                        />
                    </div>

                    {/* ✨ NEW: Price Configuration Grid ✨ */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="buyingPrice"
                            label="Buying Price (Cost ৳)"
                            type="number"
                            value={formData.buyingPrice}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            id="sellingPrice"
                            label="Selling Price (Retail ৳)"
                            type="number"
                            value={formData.sellingPrice}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* ✨ NEW: Real-time Profit Preview ✨ */}
                    {formData.buyingPrice !== '' && formData.sellingPrice !== '' && (
                        <div className={`p-3 border rounded-md text-sm font-medium ${profit > 0 ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                            {profit > 0
                                ? `Estimated Profit per unit: ৳${profit}`
                                : `Warning: You are taking a loss of ৳${Math.abs(profit)} per unit!`}
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