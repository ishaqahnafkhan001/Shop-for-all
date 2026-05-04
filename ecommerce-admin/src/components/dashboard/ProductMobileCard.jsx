import { Package, Edit, Trash2 } from 'lucide-react';

const ProductMobileCard = ({ product, onEdit, onDelete }) => {
    const sellingPrice = product.pricing?.sellingPrice || 0;
    const buyingPrice  = product.pricing?.buyingPrice  || 0;
    const discount     = product.pricing?.discount     || 0;
    const finalPrice   = Math.round(sellingPrice - (sellingPrice * discount / 100));
    const profit       = finalPrice - buyingPrice;

    // FIX: product.stock doesn't exist — stock lives inside product.variants[].stock
    const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

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

            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                    <span className="font-bold text-indigo-600">৳ {finalPrice}</span>
                    <span className={`text-[10px] font-medium ${profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        Profit: ৳ {profit}
                    </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    totalStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                    {totalStock > 0 ? `${totalStock} Left` : 'Out of Stock'}
                </span>
            </div>

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