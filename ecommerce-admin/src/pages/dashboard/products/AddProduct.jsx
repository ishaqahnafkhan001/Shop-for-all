import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const AddProduct = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // State updated to remove the old 'price' and use buying/selling prices
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        buyingPrice: '',
        sellingPrice: '',
        category: '',
        stock: '',
        imageUrl: 'https://via.placeholder.com/150'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // POST to your real backend route with the new price fields parsed as Numbers
            await API.post('/admin/products', {
                ...formData,
                buyingPrice: Number(formData.buyingPrice),
                sellingPrice: Number(formData.sellingPrice),
                stock: Number(formData.stock)
            });

            toast.success("Product added successfully!");
            navigate('/dashboard/products');
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add product");
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate profit dynamically for the UI
    const profit = (Number(formData.sellingPrice) || 0) - (Number(formData.buyingPrice) || 0);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input id="title" label="Product Title" value={formData.title} onChange={handleChange} placeholder="e.g. Mechanical Keyboard" required />

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                            placeholder="0"
                            required
                        />
                        <Input
                            id="sellingPrice"
                            label="Selling Price (Retail ৳)"
                            type="number"
                            value={formData.sellingPrice}
                            onChange={handleChange}
                            placeholder="0"
                            required
                        />
                    </div>

                    {/* ✨ NEW: Real-time Profit Preview ✨ */}
                    {formData.buyingPrice && formData.sellingPrice && (
                        <div className={`p-3 border rounded-md text-sm font-medium ${profit > 0 ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                            {profit > 0
                                ? `Estimated Profit per unit: ৳${profit}`
                                : `Warning: You are taking a loss of ৳${Math.abs(profit)} per unit!`}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input id="stock" label="Stock Quantity" type="number" value={formData.stock} onChange={handleChange} placeholder="0" required />
                        <Input id="category" label="Category" value={formData.category} onChange={handleChange} placeholder="e.g. Electronics" required />
                    </div>

                    <div className="pt-4">
                        <Button type="submit" isLoading={isLoading}>Save Product</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProduct;