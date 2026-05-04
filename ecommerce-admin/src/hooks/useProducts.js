import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import API from '../api/api';

export const useProducts = () => {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  // FIX: added try/catch — without it any network error leaves loading=true forever
  // and the error is silently swallowed with no feedback to the user
  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/products?page=${page}`);
      setProducts(res.data.data || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load products");
      setProducts([]);
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
      setProducts((prev) =>
          Array.isArray(prev) ? prev.filter(p => p._id !== id) : []
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete product");
    }
  };

  return {
    products: Array.isArray(products) ? products : [],
    loading,
    pagination,
    deleteProduct,
    refetchProducts: fetchProducts
  };
};