import { Package, Edit, Trash2 } from 'lucide-react';

const ProductMobileCard = ({ product, onEdit, onDelete }) => {
    const profit = (product.sellingPrice || 0) - (product.buyingPrice || 0);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3 relative">
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
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

            {/* Middle Row: Price, Profit & Stock */}
            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                    <span className="font-bold text-indigo-600">৳ {product.sellingPrice}</span>
                    <span className={`text-[10px] font-medium ${profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        Profit: ৳{profit}
                    </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                    {product.stock > 0 ? `${product.stock} Left` : 'Out of Stock'}
                </span>
            </div>

            {/* Bottom Row: Actions */}
            <div className="pt-2 flex justify-end space-x-2 border-t border-gray-50">
                <button
                    onClick={() => onEdit(product)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                >
                    <Edit size={18} />
                </button>
                <button
                    onClick={() => onDelete(product._id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

export default ProductMobileCard;