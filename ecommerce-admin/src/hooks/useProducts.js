import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import API from '../api/api'; // Ensure this path is correct
import { isAbortError, useAbortableRequest } from './useAbortableRequest';
import useDebouncedValue from './useDebouncedValue';

export const useProducts = (initialLimit = 10) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Capture the categories sent by backend
  const [loading, setLoading] = useState(true);

  // 1. Manage all query parameters in one state object
    const [queryParams, setQueryParams] = useState({
        page: 1,
        limit: initialLimit,
        search: '',
        category: '',
        status: '',
        sort: ''
    });

  // 2. Align with your backend's pagination structure (page, pages, total)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const runAbortable = useAbortableRequest();
  const debouncedSearch = useDebouncedValue(queryParams.search, 300);
  const fetchIdRef = useRef(0);

  const fetchProducts = useCallback(async () => {
    const fetchId = fetchIdRef.current + 1;
    fetchIdRef.current = fetchId;
    setLoading(true);
    try {
      await runAbortable(async ({ signal, isLatest }) => {
      // 3. Build the query string dynamically
      const params = new URLSearchParams({
        page: queryParams.page,
        limit: queryParams.limit,
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (queryParams.category) params.append('category', queryParams.category);
      if (queryParams.status) params.append('status', queryParams.status);
      if (queryParams.sort) params.append('sort', queryParams.sort);

      const res = await API.get(`/admin/products?${params.toString()}`, { signal });
      if (!isLatest() || fetchId !== fetchIdRef.current) return;

      setProducts(res.data.data || []);
      setCategories(res.data.categories || []); // Store distinct categories

      if (res.data.pagination) {
        setPagination({
          page: res.data.pagination.page,
          pages: res.data.pagination.pages, // Note: backend sends 'pages', not 'totalPages'
          total: res.data.pagination.total,
          limit: res.data.pagination.limit || queryParams.limit,
          totalPages: res.data.pagination.totalPages || res.data.pagination.pages,
          hasNextPage: Boolean(res.data.pagination.hasNextPage),
          hasPrevPage: Boolean(res.data.pagination.hasPrevPage)
        });
      }
      });
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error(err.response?.data?.error || "Failed to load products");
      setProducts([]);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, queryParams.category, queryParams.limit, queryParams.page, queryParams.sort, queryParams.status, runAbortable]); // Re-run this callback if query params change

  // 4. Automatically fetch when queryParams change
  useEffect(() => {
    const timer = setTimeout(fetchProducts, 0);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // --- ACTIONS ---

  // Easily change the page from your component
  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination.totalPages || pagination.pages)) {
      setQueryParams((prev) => ({ ...prev, page: newPage }));
    }
  };

  // Easily update filters (resets to page 1 automatically)
  const updateFilters = (filters) => {
    setQueryParams((prev) => ({ ...prev, ...filters, page: 1 }));
  };

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
    categories,
    loading,
    pagination,
    queryParams,
    goToPage,
    updateFilters,
    deleteProduct,
    refetchProducts: fetchProducts
  };
};
