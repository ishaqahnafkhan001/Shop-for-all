import {Link, useNavigate} from 'react-router-dom';
import {Plus, Edit, Trash2, Package} from 'lucide-react';
import Table from '../../../components/ui/Table';
import {useProducts} from '../../../hooks/useProducts';

const ProductList = () => {
    const navigate = useNavigate();
    const {products, loading, deleteProduct} = useProducts();

    const handleEdit = (product) => {
        navigate(`/dashboard/products/edit/${product._id}`, {state: {product}});
    };

    const getTotalStock = (product) =>
        product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

    const getFinalPrice = (product) => {
        const price = product.pricing?.sellingPrice || 0;
        const discount = product.pricing?.discount || 0;
        return Math.round(price - (price * discount / 100));
    };

    const columns = [
        {
            label: 'Product',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package size={18}/>
                    </div>
                    <div>
                        <p className="font-medium">{row.title}</p>
                        <p className="text-xs text-gray-400">
                            {row.variants?.length || 0} variants
                        </p>
                    </div>
                </div>
            )
        },
        {
            label: 'Price',
            render: (row) => (
                <div>
                    <p className="font-semibold">৳ {row.pricing?.sellingPrice}</p>
                    <p className="text-xs text-gray-400">
                        Cost: ৳ {row.pricing?.buyingPrice}
                    </p>
                </div>
            )
        },
        {
            label: 'Stock',
            render: (row) => {
                const stock = getTotalStock(row);
                return (
                    <span className={`px-2 py-1 rounded text-xs ${
                        stock > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                    }`}>
            {stock > 0 ? `${stock}` : 'Out'}
          </span>
                );
            }
        }
    ];

    const renderActions = (row) => (
        <div className="flex gap-2 justify-end">
            <button
                onClick={() => handleEdit(row)}
                className="p-1.5 rounded hover:bg-blue-50"
            >
                <Edit size={16}/>
            </button>

            <button
                onClick={() => deleteProduct(row._id)}
                className="p-1.5 rounded hover:bg-red-50"
            >
                <Trash2 size={16}/>
            </button>
        </div>
    );

    return (
        <div className="space-y-6 px-3 sm:px-0">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Products</h1>
                    <p className="text-sm text-gray-500">Manage your inventory</p>
                </div>

                <Link
                    to="/dashboard/products/add"
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
                >
                    <Plus size={18} className="mr-2"/>
                    Add Product
                </Link>
            </div>

            {/* LOADING */}
            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="animate-pulse bg-gray-100 h-16 rounded-lg"
                        />
                    ))}
                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && (!Array.isArray(products) || products.length === 0) && (
                <div className="text-center py-10 bg-white border rounded-lg">
                    <p className="text-gray-500">No products found</p>
                    <Link
                        to="/dashboard/products/add"
                        className="inline-block mt-3 text-indigo-600 font-medium"
                    >
                        Add your first product
                    </Link>
                </div>
            )}

            {/* DATA */}
            {!loading && Array.isArray(products) && products.length > 0 && (
                <>
                    {/* DESKTOP */}
                    <div className="hidden md:block">
                        <Table
                            columns={columns}
                            data={products}
                            actions={renderActions}
                        />
                    </div>

                    {/* MOBILE CARDS */}
                    <div className="md:hidden space-y-3">
                        {products.map((p) => {
                            const stock = getTotalStock(p);
                            const final = getFinalPrice(p);

                            return (
                                <div
                                    key={p._id}
                                    className="bg-white border rounded-xl p-4 shadow-sm transition hover:shadow-md"
                                >
                                    {/* TOP */}
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="font-semibold">{p.title}</h2>
                                            <p className="text-xs text-gray-400">
                                                {p.category || 'No category'}
                                            </p>
                                        </div>

                                        <span className={`text-xs px-2 py-1 rounded ${
                                            stock > 0
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-600'
                                        }`}>
                      {stock > 0 ? stock : 'Out'}
                    </span>
                                    </div>

                                    {/* PRICE */}
                                    <div className="mt-3 flex justify-between text-sm">
                                        <div>
                                            <p className="font-bold">৳ {final}</p>
                                            <p className="text-xs text-gray-400">
                                                Cost: ৳ {p.pricing?.buyingPrice}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(p)}
                                                className="p-2 bg-blue-50 rounded"
                                            >
                                                <Edit size={16}/>
                                            </button>

                                            <button
                                                onClick={() => deleteProduct(p._id)}
                                                className="p-2 bg-red-50 rounded"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductList;

