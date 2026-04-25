
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
    category: '',
    images: ['https://via.placeholder.com/150'],

    pricing: {
      buyingPrice: '',
      sellingPrice: '',
      discount: 0
    },

    variants: [
      {
        attributes: [
          { name: 'color', value: 'white' }
        ],
        stock: 0
      }
    ]
  });

  // 🔹 Basic change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // 🔹 Pricing change
  const handlePricingChange = (e) => {
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing,
        [e.target.id]: Number(e.target.value)
      }
    });
  };

  // 🔹 Variant change
  const handleVariantChange = (index, field, value) => {
    const updated = [...formData.variants];
    updated[index][field] = value;
    setFormData({ ...formData, variants: updated });
  };

  // 🔹 Attribute change
  const handleAttributeChange = (vIndex, aIndex, field, value) => {
    const updated = [...formData.variants];
    updated[vIndex].attributes[aIndex][field] = value;
    setFormData({ ...formData, variants: updated });
  };

  // 🔹 Add Variant
  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        {
          attributes: [{ name: '', value: '' }],
          stock: 0
        }
      ]
    });
  };

  // 🔹 Submit
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

  const finalPrice =
    formData.pricing.sellingPrice -
    (formData.pricing.sellingPrice * formData.pricing.discount) / 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">Add Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 🔹 BASIC */}
        <Input id="title" label="Title" value={formData.title} onChange={handleChange} required />
        <textarea id="description" value={formData.description} onChange={handleChange} />

        <Input id="category" label="Category" value={formData.category} onChange={handleChange} />

        {/* 🔹 PRICING */}
        <div className="grid grid-cols-3 gap-4">
          <Input id="buyingPrice" label="Buying" type="number" onChange={handlePricingChange} />
          <Input id="sellingPrice" label="Selling" type="number" onChange={handlePricingChange} />
          <Input id="discount" label="Discount %" type="number" onChange={handlePricingChange} />
        </div>

        <div className="p-3 bg-gray-100 rounded">
          Final Price: ৳{Math.round(finalPrice || 0)}
        </div>

        {/* 🔹 VARIANTS */}
        <div>
          <h2 className="font-semibold">Variants</h2>

          {formData.variants.map((variant, vIndex) => (
            <div key={vIndex} className="border p-3 rounded space-y-2">

              {variant.attributes.map((attr, aIndex) => (
                <div key={aIndex} className="flex gap-2">
                  <input
                    placeholder="Attribute (color)"
                    value={attr.name}
                    onChange={(e) =>
                      handleAttributeChange(vIndex, aIndex, 'name', e.target.value)
                    }
                  />
                  <input
                    placeholder="Value (white)"
                    value={attr.value}
                    onChange={(e) =>
                      handleAttributeChange(vIndex, aIndex, 'value', e.target.value)
                    }
                  />
                </div>
              ))}

              <Input
                label="Stock"
                type="number"
                value={variant.stock}
                onChange={(e) =>
                  handleVariantChange(vIndex, 'stock', Number(e.target.value))
                }
              />
            </div>
          ))}

          <button type="button" onClick={addVariant}>
            + Add Variant
          </button>
        </div>

        <Button type="submit" isLoading={isLoading}>
          Save Product
        </Button>

      </form>
    </div>
  );
};

export default AddProduct;

