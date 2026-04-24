import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const AddProduct = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // State matching your Joi Validation schema
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        imageUrl: 'https://via.placeholder.com/150' // Temporary placeholder until we add Cloudinary
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // POST to your real backend route
            await API.post('/admin/products', {
                ...formData,
                price: Number(formData.price),
                stock: Number(formData.stock)
            });

            toast.success("Product added successfully!");
            navigate('/dashboard/products'); // Send them back to the list
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add product");
        } finally {
            setIsLoading(false);
        }
    };

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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input id="price" label="Price (৳)" type="number" value={formData.price} onChange={handleChange} placeholder="0.00" required />
                        <Input id="stock" label="Stock Quantity" type="number" value={formData.stock} onChange={handleChange} placeholder="0" required />
                    </div>

                    <Input id="category" label="Category" value={formData.category} onChange={handleChange} placeholder="e.g. Electronics" required />

                    <div className="pt-4">
                        <Button type="submit" isLoading={isLoading}>Save Product</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProduct;