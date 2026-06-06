import { X, Tag, ShieldCheck, List, Layers, Package, Star } from 'lucide-react';

const DetailSection = ({ icon: Icon, title, data }) => (
    data && data.length > 0 && (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-100">
                <Icon size={18} className="text-indigo-600" />
                <h3 className="font-bold text-gray-900">{title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded-lg">
                        <p className="text-[10px] uppercase text-gray-400 font-bold">{item.title}</p>
                        <p className="text-sm text-gray-700">{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    )
);

const ProductDetailModal = ({ product, isOpen, onClose }) => {
    // Early return if not open
    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Package size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">{product.title}</h2>
                            <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Final Price</p>
                            <p className="text-lg font-black text-indigo-600">৳{product.finalPrice}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Discount</p>
                            <p className="text-lg font-black text-red-500">{product.pricing?.discount}%</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Stock</p>
                            <p className="text-lg font-black text-gray-900">{product.totalStock}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Buying Price</p>
                            <p className="text-lg font-black text-gray-400">৳{product.pricing?.buyingPrice}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-8">
                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <List size={18} className="text-indigo-600"/> Description
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                    </div>

                    {/* Variants Table */}
                    <div className="mb-8">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-600"/> Variants & Stock
                        </h3>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-2">Attributes</th>
                                    <th className="px-4 py-2">SKU</th>
                                    <th className="px-4 py-2">Stock</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {product.variants?.map((v, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3">
                                            {v.attributes?.map(a => `${a.name}: ${a.value}`).join(', ')}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{v.sku || 'N/A'}</td>
                                        <td className="px-4 py-3 font-bold">{v.stock}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Dynamic Sections */}
                    <DetailSection title="Features" icon={Star} data={product.features} />
                    <DetailSection title="Specifications" icon={ShieldCheck} data={product.specifications} />
                    <DetailSection title="Internal Comments" icon={Tag} data={product.comments} />
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;
