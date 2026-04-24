import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const AddProduct = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        buyingPrice: '',
        sellingPrice: '',
        // ✨ NEW: Discount state
        discount: 0,
        category: '',
        stock: '',
        imageUrl: 'https://via.placeholder.com/150'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    // ✨ Calculation Logic
    const calculateDiscountedPrice = () => {
        const price = Number(formData.sellingPrice) || 0;
        const disc = Number(formData.discount) || 0;
        return Math.round(price - (price * disc / 100));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await API.post('/admin/products', {
                ...formData,
                buyingPrice: Number(formData.buyingPrice),
                sellingPrice: Number(formData.sellingPrice),
                // ✨ Include discount in the payload
                discount: Number(formData.discount),
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

    const finalSalePrice = calculateDiscountedPrice();
    const profit = finalSalePrice - (Number(formData.buyingPrice) || 0);

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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
                            placeholder="0"
                            required
                        />
                        <Input
                            id="sellingPrice"
                            label="Retail Price (৳)"
                            type="number"
                            value={formData.sellingPrice}
                            onChange={handleChange}
                            placeholder="0"
                            required
                        />
                        {/* ✨ NEW: Discount Percentage Input ✨ */}
                        <Input
                            id="discount"
                            label="Discount (%)"
                            type="number"
                            value={formData.discount}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            max="100"
                        />
                    </div>

                    {/* ✨ NEW: Smart Price & Profit Preview ✨ */}
                    {formData.sellingPrice && (
                        <div className={`p-4 border rounded-xl space-y-2 ${profit > 0 ? 'bg-indigo-50/50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 font-medium">Final Sale Price:</span>
                                <span className="font-bold text-indigo-700">৳{finalSalePrice}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 font-medium">Projected Profit:</span>
                                <span className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ৳{profit} {profit <= 0 && '(Loss!)'}
                                </span>
                            </div>
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