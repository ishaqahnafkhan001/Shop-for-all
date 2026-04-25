
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
    variants: []
  });

  // 🔹 Fetch product (fallback if refresh)
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

          variants: product.variants || []
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

  // 🔹 Basic change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // 🔹 Pricing change
  const handlePricing = (e) => {
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing,
        [e.target.id]: Number(e.target.value)
      }
    });
  };

  // 🔹 Variant stock change
  const handleVariantStock = (index, value) => {
    const updated = [...formData.variants];
    updated[index].stock = Number(value);
    setFormData({ ...formData, variants: updated });
  };

  // 🔹 Calculations
  const finalPrice =
    formData.pricing.sellingPrice -
    (formData.pricing.sellingPrice * formData.pricing.discount) / 100;

  const profit = finalPrice - formData.pricing.buyingPrice;

  // 🔹 Submit
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

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Edit Product</h1>

        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 rounded-xl shadow border">

        {/* BASIC */}
        <div className="grid gap-4">
          <Input id="title" label="Title" value={formData.title} onChange={handleChange} />

          <textarea
            id="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded p-2"
            rows="3"
          />

          <Input id="category" label="Category" value={formData.category} onChange={handleChange} />
        </div>

        {/* PRICING */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input id="buyingPrice" label="Buying" type="number" value={formData.pricing.buyingPrice} onChange={handlePricing} />
          <Input id="sellingPrice" label="Selling" type="number" value={formData.pricing.sellingPrice} onChange={handlePricing} />
          <Input id="discount" label="Discount %" type="number" value={formData.pricing.discount} onChange={handlePricing} />
        </div>

        {/* PRICE PREVIEW */}
        <div className={`p-4 rounded border ${profit > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex justify-between text-sm">
            <span>Final Price:</span>
            <span className="font-bold">৳ {Math.round(finalPrice)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Profit:</span>
            <span className={profit > 0 ? 'text-green-600' : 'text-red-600'}>
              ৳ {profit}
            </span>
          </div>
        </div>

        {/* VARIANTS */}
        <div>
          <h2 className="font-semibold mb-2">Variants</h2>

          {formData.variants.map((variant, i) => (
            <div key={i} className="border p-3 rounded mb-2">

              <div className="text-xs text-gray-500 mb-1">
                {variant.attributes?.map(a => `${a.name}: ${a.value}`).join(', ')}
              </div>

              <Input
                label="Stock"
                type="number"
                value={variant.stock}
                onChange={(e) => handleVariantStock(i, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* BUTTON */}
        <Button type="submit" isLoading={isSubmitting}>
          Update Product
        </Button>

      </form>
    </div>
  );
};

export default EditProduct;

