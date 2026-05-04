import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'react-hot-toast';
import {Plus, Trash2} from 'lucide-react';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const AddProduct = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        images: ['https://via.placeholder.com/150'],

        pricing: {
            buyingPrice: '',
            sellingPrice: '',
            discount: 0
        },

        variants: [
            {
                attributes: [{name: 'color', value: 'white'}],
                stock: 0
            }
        ],

        features: [],
        specifications: [],
        comments: []
    });

    // 🔹 Basic change
    const handleChange = (e) => {
        setFormData({...formData, [e.target.id]: e.target.value});
    };

    const handlePricing = (e) => {
        setFormData({
            ...formData,
            pricing: {
                ...formData.pricing,
                [e.target.id]: Number(e.target.value)
            }
        });
    };

    // 🔹 Variants
    const handleVariantChange = (i, field, value) => {
        const updated = [...formData.variants];
        updated[i][field] = value;
        setFormData({...formData, variants: updated});
    };

    const handleAttributeChange = (v, a, field, value) => {
        const updated = [...formData.variants];
        updated[v].attributes[a][field] = value;
        setFormData({...formData, variants: updated});
    };

    const addVariant = () => {
        setFormData({
            ...formData,
            variants: [
                ...formData.variants,
                {attributes: [{name: '', value: ''}], stock: 0}
            ]
        });
    };

    const removeVariant = (i) => {
        setFormData({
            ...formData,
            variants: formData.variants.filter((_, index) => index !== i)
        });
    };

    // 🔹 Dynamic Key-Value (features/specs/comments)
    const handleKVChange = (type, index, field, value) => {
        const updated = [...formData[type]];
        updated[index][field] = value;
        setFormData({...formData, [type]: updated});
    };

    const addKV = (type) => {
        setFormData({
            ...formData,
            [type]: [...formData[type], {title: '', value: ''}]
        });
    };

    const removeKV = (type, index) => {
        const updated = formData[type].filter((_, i) => i !== index);
        setFormData({...formData, [type]: updated});
    };



    const finalPrice =
        formData.pricing.sellingPrice -
        (formData.pricing.sellingPrice * formData.pricing.discount) / 100;

    const profit =
        (finalPrice || 0) - (Number(formData.pricing.buyingPrice) || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await API.post('/admin/products', formData);
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
                    <Input id="title" label="Title" value={formData.title} onChange={handleChange} required/>

                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        placeholder="Description"
                    />

                    <Input id="category" label="Category" value={formData.category} onChange={handleChange}/>
                </div>

                {/* PRICING */}
                <div className="bg-white p-5 rounded-xl border space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="buyingPrice" label="Buying" type="number" onChange={handlePricing}/>
                        <Input id="sellingPrice" label="Selling" type="number" onChange={handlePricing}/>
                        <Input id="discount" label="Discount %" type="number" onChange={handlePricing}/>
                    </div>

                    <div className={`p-4 rounded-lg border space-y-2 ${
                        profit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Final Price:
                            </span>
                            <span className="font-bold text-indigo-600">
                                ৳ {Math.round(finalPrice || 0)}
                            </span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Estimated Profit:</span>
                            <span className={`font-bold ${
                                profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>৳ {profit} {profit < 0 && '(Loss!)'}</span>
                        </div>

                    </div>
                </div>

                {/* VARIANTS */}
                <div className="bg-white p-5 rounded-xl border space-y-4">
                    <div className="flex justify-between">
                        <h2 className="font-semibold">Variants</h2>
                        <button type="button" onClick={addVariant}
                                className="text-indigo-600 text-sm flex items-center">
                            <Plus size={14} className="mr-1"/> Add
                        </button>
                    </div>

                    {formData.variants.map((v, i) => (
                        <div key={i} className="border p-3 rounded relative space-y-2">

                            {formData.variants.length > 1 && (
                                <button onClick={() => removeVariant(i)} type="button"
                                        className="absolute top-2 right-2 text-red-500">
                                    <Trash2 size={14}/>
                                </button>
                            )}

                            {v.attributes.map((a, ai) => (
                                <div key={ai} className="grid grid-cols-2 gap-2">
                                    <input
                                        className="border rounded p-1"
                                        value={a.name}
                                        placeholder="Attribute"
                                        onChange={(e) => handleAttributeChange(i, ai, 'name', e.target.value)}
                                    />
                                    <input
                                        className="border rounded p-1"
                                        value={a.value}
                                        placeholder="Value"
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

                {/* 🔹 REUSABLE KV SECTION */}
                {['features', 'specifications', 'comments'].map((type) => (
                    <div key={type} className="bg-white p-5 rounded-xl border space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="font-semibold capitalize">{type}</h2>
                            <button type="button" onClick={() => addKV(type)}
                                    className="text-indigo-600 text-sm flex items-center">
                                <Plus size={14} className="mr-1"/> Add
                            </button>
                        </div>

                        {formData[type].map((item, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2 relative">
                                <input
                                    className="border rounded p-2"
                                    placeholder="Title"
                                    value={item.title}
                                    onChange={(e) => handleKVChange(type, index, 'title', e.target.value)}
                                />
                                <input
                                    className="border rounded p-2"
                                    placeholder="Value"
                                    value={item.value}
                                    onChange={(e) => handleKVChange(type, index, 'value', e.target.value)}
                                />

                                <button
                                    type="button"
                                    onClick={() => removeKV(type, index)}
                                    className="absolute right-0 top-0 text-red-500"
                                >
                                    <Trash2 size={14}/>
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

