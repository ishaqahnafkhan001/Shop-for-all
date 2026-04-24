import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import API from '../api/api'; // Adjust path if needed

export const useProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/admin/products');
            setProducts(data);
        } catch (err) {
            toast.error("Failed to load products");
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
            setProducts((prevProducts) => prevProducts.filter(p => p._id !== id));
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete product");
        }
    };

    return { products, loading, deleteProduct, refetchProducts: fetchProducts };
};