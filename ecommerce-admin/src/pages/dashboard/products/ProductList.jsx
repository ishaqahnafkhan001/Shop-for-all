import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import Table from '../../../components/ui/Table';
import ProductMobileCard from '../../../components/dashboard/ProductMobileCard.jsx';
import { useProducts } from '../../../hooks/useProducts';

const ProductList = () => {
    const navigate = useNavigate();
    // Use the custom hook to get data and actions
    const { products, loading, deleteProduct } = useProducts();

    const handleEdit = (product) => {
        navigate(`/dashboard/products/edit/${product._id}`, { state: { product } });
    };

    // --- Desktop Table Configuration ---
    const columns = [
        {
            label: 'Product Name',
            key: 'title',
            render: (row) => (
                <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                        <Package size={20} />
                    </div>
                    <span className="ml-4 font-medium text-gray-900">{row.title}</span>
                </div>
            )
        },
        { label: 'Category', key: 'category' },
        {
            label: 'Price (Retail)',
            key: 'sellingPrice',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">৳ {row.sellingPrice}</span>
                    <span className="text-xs text-gray-500">Cost: ৳ {row.buyingPrice}</span>
                </div>
            )
        },
        {
            label: 'Profit Margin',
            key: 'profit',
            render: (row) => {
                const profit = (row.sellingPrice || 0) - (row.buyingPrice || 0);
                return (
                    <span className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit > 0 ? '+' : ''}৳ {profit}
                    </span>
                );
            }
        },
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
            <button onClick={() => handleEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                <Edit size={18} />
            </button>
            <button onClick={() => deleteProduct(row._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                <Trash2 size={18} />
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
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

                    {/* MOBILE VIEW */}
                    <div className="md:hidden space-y-4">
                        {products.length === 0 ? (
                            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                No products found. Add one above!
                            </div>
                        ) : (
                            products.map((product) => (
                                <ProductMobileCard
                                    key={product._id}
                                    product={product}
                                    onEdit={handleEdit}
                                    onDelete={deleteProduct}
                                />
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductList;