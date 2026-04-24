import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchProducts = async () => {
        try {
            const { data } = await API.get('/admin/products');
            setProducts(data);
        } catch (err) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;

        try {
            await API.delete(`/admin/products/${id}`);
            toast.success("Product deleted");
            setProducts(products.filter(p => p._id !== id));
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete product");
        }
    };

    // --- Desktop Table Configuration ---
    const columns = [
        {
            label: 'Product Name',
            key: 'title',
            render: (row) => (
                <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                        {/* Placeholder for future product image */}
                        <Package size={20} />
                    </div>
                    <span className="ml-4 font-medium text-gray-900">{row.title}</span>
                </div>
            )
        },
        { label: 'Category', key: 'category' },
        { label: 'Price (৳)', key: 'price', render: (row) => <span className="font-semibold text-gray-700">৳ {row.price}</span> },
        {
            label: 'Stock',
            key: 'stock',
            render: (row) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {row.stock > 0 ? `${row.stock} In Stock` : 'Out of Stock'}
                </span>
            )
        },
    ];

    const renderActions = (row) => (
        <div className="flex justify-end space-x-2">
            <button
                onClick={() => navigate(`/dashboard/products/edit/${row._id}`, { state: { product: row } })}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit"
            >
                <Edit size={18} />
            </button>
            <button
                onClick={() => handleDelete(row._id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header Area - Stacks on very small screens */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage your inventory and pricing.</p>
                </div>
                <Link
                    to="/dashboard/products/add"
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition w-full sm:w-auto shadow-sm"
                >
                    <Plus size={20} className="mr-2" /> Add Product
                </Link>
            </div>

            {loading ? (
                <div className="py-10 text-center text-gray-500">Loading your inventory...</div>
            ) : (
                <>
                    {/* DESKTOP VIEW */}
                    <div className="hidden md:block">
                        <Table columns={columns} data={products} actions={renderActions} />
                    </div>

                    {/* MOBILE VIEW: Card Layout */}
                    <div className="md:hidden space-y-4">
                        {products.length === 0 ? (
                            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                No products found. Add one above!
                            </div>
                        ) : (
                            products.map((product) => (
                                <div key={product._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3 relative">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center space-x-3">
                                            {/* Product Icon/Image Placeholder */}
                                            <div className="h-12 w-12 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400">
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 leading-tight pr-4">
                                                    {product.title}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle Row: Price & Stock */}
                                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                        <span className="font-bold text-indigo-600">৳ {product.price}</span>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                            product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {product.stock > 0 ? `${product.stock} Left` : 'Out of Stock'}
                                        </span>
                                    </div>

                                    {/* Bottom Row: Actions */}
                                    <div className="pt-2 flex justify-end border-t border-gray-50">
                                        {renderActions(product)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductList;