"use client";
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus, Edit, Trash2, Package, Layers,
    TrendingDown, Eye, AlertCircle
} from 'lucide-react';

// UI Components
import Table from '../../../components/ui/Table';
import ProductDetailModal from '../../../components/products/ProductDetailModal.jsx';

// Hooks
import { useProducts } from '../../../hooks/useProducts';

const ProductList = () => {
    const navigate = useNavigate();
    const { products, loading, deleteProduct } = useProducts();

    // --- State for Detail Modal ---
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Action Handlers ---
    const handleEdit = (product) => {
        navigate(`/dashboard/products/edit/${product._id}`, { state: { product } });
    };

    const handleOpenDetails = (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseDetails = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    // --- Table Column Definitions ---
    const columns = [
        {
            label: 'Product Info',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                        {row.images?.[0] ? (
                            <img src={row.images[0]} alt={row.title} className="object-cover h-full w-full" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">
                                <Package size={20} />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 leading-tight">{row.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                {row.category || 'General'}
                            </span>
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Layers size={10}/> {row.variants?.length || 0} Variants
                            </span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            label: 'Inventory',
            render: (row) => {
                const stock = row.totalStock ?? 0;
                const isLowStock = stock > 0 && stock < 5;
                return (
                    <div className="space-y-1">
                        <div className={`text-sm font-bold flex items-center gap-1.5 ${
                            stock === 0 ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-gray-700'
                        }`}>
                            {isLowStock && <AlertCircle size={14} />}
                            {stock === 0 ? 'Out of Stock' : `${stock} Available`}
                        </div>
                        <div className="flex gap-1">
                            {row.variants?.slice(0, 4).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                            ))}
                        </div>
                    </div>
                );
            }
        },
        {
            label: 'Pricing (৳)',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">৳{row.finalPrice}</span>
                        {row.pricing?.discount > 0 && (
                            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-bold flex items-center">
                                <TrendingDown size={10} className="mr-0.5"/> {row.pricing.discount}%
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">
                        List: <span className="line-through">৳{row.pricing?.sellingPrice}</span>
                    </p>
                </div>
            )
        },
        {
            label: 'Status',
            render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    row.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                }`}>
                    {row.isActive ? 'Active' : 'Draft'}
                </span>
            )
        }
    ];

    const renderActions = (row) => (
        <div className="flex gap-1 justify-end">
            <button
                onClick={() => handleOpenDetails(row)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Quick View"
            >
                <Eye size={18}/>
            </button>
            <button
                onClick={() => handleEdit(row)}
                className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
                title="Edit"
            >
                <Edit size={18}/>
            </button>
            <button
                onClick={() => deleteProduct(row._id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                title="Delete"
            >
                <Trash2 size={18}/>
            </button>
        </div>
    );

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* --- TOP HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Product Catalog</h1>
                    <p className="text-gray-500 text-sm">Manage inventory, monitor stock levels, and adjust pricing.</p>
                </div>
                <Link
                    to="/dashboard/products/add"
                    className="w-full md:w-auto flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-xl shadow-gray-200 hover:bg-indigo-600 transition-all active:scale-95"
                >
                    <Plus size={20} className="mr-2"/>
                    Add New Product
                </Link>
            </div>

            {/* --- MAIN CONTENT --- */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-white animate-pulse rounded-2xl border border-gray-100" />
                    ))}
                </div>
            ) : products?.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-20 text-center">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No products found</h3>
                    <p className="text-gray-500 text-sm mb-6">Start by adding your first item to the inventory.</p>
                    <Link to="/dashboard/products/add" className="text-indigo-600 font-bold hover:underline">
                        + Add Product
                    </Link>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <Table
                            columns={columns}
                            data={products}
                            actions={renderActions}
                        />
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-gray-50">
                        {products.map((p) => (
                            <div key={p._id} className="p-5 space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                                        <img src={p.images?.[0]} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">{p.title}</h3>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">{p.category}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-indigo-600 font-black">৳{p.finalPrice}</span>
                                            {p.totalStock < 5 && p.totalStock > 0 && (
                                                <span className="text-[10px] text-orange-500 font-bold flex items-center gap-0.5">
                                                    <AlertCircle size={10}/> Low Stock
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                                    <span className="text-[11px] font-bold text-gray-400 pl-2">
                                        {p.variants?.length || 0} VARIANTS
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleOpenDetails(p)} className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500"><Eye size={18}/></button>
                                        <button onClick={() => handleEdit(p)} className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500"><Edit size={18}/></button>
                                        <button onClick={() => deleteProduct(p._id)} className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm text-red-500"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- POPUP MODAL --- */}
            <ProductDetailModal
                isOpen={isModalOpen}
                product={selectedProduct}
                onClose={handleCloseDetails}
            />
        </div>
    );
};

export default ProductList;