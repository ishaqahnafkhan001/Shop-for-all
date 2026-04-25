
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import API from '../api/api';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const res = await API.get('/admin/products');

      // 🔥 Handle ALL possible backend formats safely
      let productData = [];

      if (Array.isArray(res.data)) {
        productData = res.data;
      } else if (Array.isArray(res.data?.data)) {
        productData = res.data.data;
      } else if (Array.isArray(res.data?.products)) {
        productData = res.data.products;
      } else {
        productData = [];
        console.warn("Unexpected product response:", res.data);
      }

      setProducts(productData);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
      setProducts([]); // 🔥 prevent crash
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await API.delete(`/admin/products/${id}`);

      toast.success("Product deleted");

      // 🔥 Safe update
      setProducts((prev) =>
        Array.isArray(prev) ? prev.filter(p => p._id !== id) : []
      );

    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete product");
    }
  };

  return {
    products: Array.isArray(products) ? products : [], // 🔥 always safe
    loading,
    deleteProduct,
    refetchProducts: fetchProducts
  };
};

