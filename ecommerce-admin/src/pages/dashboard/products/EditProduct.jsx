
import {useState, useEffect} from 'react';
import {useNavigate, useParams, useLocation} from 'react-router-dom';
import {toast} from 'react-hot-toast';
import {Plus, Trash2} from 'lucide-react';
import API from '../../../api/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const EditProduct = () => {
    const navigate = useNavigate();
    const {id} = useParams();
    const {state} = useLocation();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        pricing: {
            buyingPrice: 0,
            sellingPrice: 0,
            discount: 0
        },
        variants: [],
        features: [],
        specifications: [],
        comments: []
    });

    // 🔹 LOAD PRODUCT
    useEffect(() => {
        const loadProduct = async () => {
            try {
                let product = state?.product;

                if (!product) {
                    const res = await API.get(`/admin/products/${id}`);
                    product = res.data.data || res.data;
                }

                setFormData({
                    title: product.title,
                    description: product.description,
                    category: product.category,

                    pricing: {
                        buyingPrice: product.pricing?.buyingPrice || 0,
                        sellingPrice: product.pricing?.sellingPrice || 0,
                        discount: product.pricing?.discount || 0
                    },

                    variants: product.variants || [],
                    features: product.features || [],
                    specifications: product.specifications || [],
                    comments: product.comments || []
                });

            } catch (err) {
                toast.error("Failed to load product");
                navigate('/dashboard/products');
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [id, state, navigate]);

    // 🔹 BASIC
    const handleChange = (e) => {
        setFormData({...formData, [e.target.id]: e.target.value});
    };

    // 🔹 PRICING
    const handlePricing = (e) => {
        setFormData({
            ...formData,
            pricing: {
                ...formData.pricing,
                [e.target.id]: Number(e.target.value)
            }
        });
    };

    // 🔹 VARIANT STOCK
    const handleVariantStock = (i, value) => {
        const updated = [...formData.variants];
        updated[i].stock = Number(value);
        setFormData({...formData, variants: updated});
    };

    // 🔹 KEY VALUE HANDLER
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

    // 🔹 CALCULATION
    const selling = Number(formData.pricing.sellingPrice) || 0;
    const buying = Number(formData.pricing.buyingPrice) || 0;
    const discount = Number(formData.pricing.discount) || 0;

    const finalPrice = selling - (selling * discount / 100);
    const profit = finalPrice - buying;

    // 🔹 SUBMIT
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await API.patch(`/admin/products/${id}`, formData);
            toast.success("Product updated");
            navigate('/dashboard/products');
        } catch (err) {
            toast.error(err.response?.data?.error || "Update failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-10">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <h1 className="text-xl sm:text-2xl font-bold">Edit Product</h1>
                <button onClick={() => navigate(-1)} className="text-sm text-gray-500">
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 rounded-xl border">

                {/* BASIC */}
                <Input id="title" label="Title" value={formData.title} onChange={handleChange}/>

                <textarea
                    id="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full border rounded p-2"
                />

                <Input id="category" label="Category" value={formData.category} onChange={handleChange}/>

                {/* PRICING */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* FIX: Bind to 'buying', not 'selling' */}
                    <Input id="buyingPrice" label="Buying" type="number" value={buying} onChange={handlePricing}/>
                    <Input id="sellingPrice" label="Selling" type="number" value={selling} onChange={handlePricing}/>
                    <Input id="discount" label="Discount %" type="number" value={discount} onChange={handlePricing}/>
                </div>

                {/* PRICE */}
                <div className={`p-4 border rounded ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex justify-between">
                        <span>Final Price</span>
                        <span className="font-bold">৳ {Math.round(finalPrice)}</span>
                    </div>

                    <div className="flex justify-between">
                        <span>Profit</span>
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
              ৳ {profit}
            </span>
                    </div>
                </div>

                {/* VARIANTS */}
                <div>
                    <h2 className="font-semibold">Variants</h2>
                    {formData.variants.map((v, i) => (
                        <div key={i} className="border p-3 rounded mb-2">
                            <div className="text-xs text-gray-400">
                                {v.attributes?.map(a => `${a.name}: ${a.value}`).join(', ')}
                            </div>

                            <Input
                                label="Stock"
                                type="number"
                                value={v.stock}
                                onChange={(e) => handleVariantStock(i, e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                {/* 🔥 FEATURES / SPEC / COMMENTS */}
                {['features', 'specifications', 'comments'].map((type) => (
                    <div key={type} className="space-y-2">
                        <div className="flex justify-between">
                            <h2 className="font-semibold capitalize">{type}</h2>
                            <button type="button" onClick={() => addKV(type)}
                                    className="text-indigo-600 text-sm flex items-center">
                                <Plus size={14} className="mr-1"/> Add
                            </button>
                        </div>

                        {formData[type].map((item, i) => (
                            <div key={i} className="grid grid-cols-2 gap-2 relative">
                                <input
                                    className="border p-2 rounded"
                                    value={item.title}
                                    placeholder="Title"
                                    onChange={(e) => handleKVChange(type, i, 'title', e.target.value)}
                                />
                                <input
                                    className="border p-2 rounded"
                                    value={item.value}
                                    placeholder="Value"
                                    onChange={(e) => handleKVChange(type, i, 'value', e.target.value)}
                                />

                                <button
                                    type="button"
                                    onClick={() => removeKV(type, i)}
                                    className="absolute right-0 top-0 text-red-500"
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        ))}
                    </div>
                ))}

                <Button type="submit" isLoading={isSubmitting}>
                    Update Product
                </Button>

            </form>
        </div>
    );
};

export default EditProduct;

