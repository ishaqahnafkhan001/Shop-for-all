import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus, Edit, Trash2, Package, Layers,
    TrendingDown, Eye, AlertCircle, Search
} from 'lucide-react';

// UI Components
import Table from '../../../components/ui/Table';
import ProductDetailModal from '../../../components/products/ProductDetailModal.jsx';
import API from '../../../api/api';
import { AdminEmptyState, AdminLoadingState } from '../../../components/ui/AdminState.jsx';

// Hooks
import { useProducts } from '../../../hooks/useProducts';

const ProductList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        products,
        categories,
        loading,
        pagination,
        queryParams,
        goToPage,
        updateFilters,
        deleteProduct
    } = useProducts();

    // --- State for Detail Modal ---
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const nextFilters = {};
        ['search', 'category', 'status', 'sort'].forEach(key => {
            const value = searchParams.get(key);
            if (value) nextFilters[key] = value;
        });
        if (Object.keys(nextFilters).length > 0) updateFilters(nextFilters);
        // Run once to hydrate filters from URL.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterChange = (key, value) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        setSearchParams(next);
        updateFilters({ [key]: value });
    };

    // --- Action Handlers ---
    const handleEdit = (product) => {
        navigate(`/dashboard/products/edit/${product._id}`);
    };

    const handleOpenDetails = async (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);

        try {
            const { data } = await API.get(`/admin/products/${product._id}`);
            setSelectedProduct(data.data || product);
        } catch {
            setSelectedProduct(product);
        }
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
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => handleOpenDetails(row)}>
                    <div className="relative h-14 w-14 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shadow-sm transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
                        {row.images?.[0] ? (
                            <img src={row.images[0]} alt={row.title} className="object-cover h-full w-full" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-300">
                                <Package size={24} strokeWidth={1.5} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {row.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium tracking-wide">
                                {row.category || 'General'}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                <Layers size={12} className="text-slate-400"/> {row.variantCount ?? row.variants?.length ?? 0} Variants
                            </span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            label: 'Inventory Status',
            render: (row) => {
                const stock = row.totalStock ?? 0;
                const isLowStock = stock > 0 && stock < 5;
                return (
                    <div className="flex flex-col justify-center gap-1.5">
                        <div className="flex items-center gap-1.5">
                            {stock === 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                                    Out of Stock
                                </span>
                            ) : isLowStock ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                    <AlertCircle size={12} className="mr-1" /> Low: {stock} left
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-sm font-medium text-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                    {stock} in stock
                                </span>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            label: 'Pricing',
            render: (row) => (
                <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">৳{row.finalPrice?.toLocaleString()}</span>
                        {row.pricing?.discount > 0 && (
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold flex items-center border border-emerald-100">
                                <TrendingDown size={12} className="mr-0.5"/> {row.pricing.discount}%
                            </span>
                        )}
                    </div>
                    {row.pricing?.discount > 0 && (
                        <p className="text-xs text-slate-400 font-medium mt-0.5 line-through">
                            ৳{row.pricing?.sellingPrice?.toLocaleString()}
                        </p>
                    )}
                </div>
            )
        },
        {
            label: 'Visibility',
            render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                    row.isActive
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                    {row.isActive ? 'Published' : 'Draft'}
                </span>
            )
        }
    ];

    const renderActions = (row) => (
        <div className="flex gap-1 justify-end items-center h-full">
            <button
                onClick={(e) => { e.stopPropagation(); handleOpenDetails(row); }}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all duration-200"
                title="Preview product details without leaving this page"
            >
                <Eye size={18} strokeWidth={1.5} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all duration-200"
                title="Change pricing, stock, images, variants, and SEO"
            >
                <Edit size={18} strokeWidth={1.5} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); deleteProduct(row._id); }}
                className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all duration-200"
                title="Remove this product from your store"
            >
                <Trash2 size={18} strokeWidth={1.5} />
            </button>
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">

            {/* --- TOP HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h1>
                    <p className="text-slate-500 text-sm mt-1">Add products customers can buy. Keep prices, stock, images, and publish status up to date.</p>
                </div>
                <Link
                    to="/dashboard/products/add"
                    className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm shadow-blue-200 transition-all active:scale-95 duration-200"
                >
                    <Plus size={20} className="mr-2" strokeWidth={2} />
                    Add Product
                </Link>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_150px_170px]">
                <label className="relative block">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={queryParams.search}
                        onChange={(event) => handleFilterChange('search', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Search products..."
                    />
                </label>
                <select
                    value={queryParams.category}
                    onChange={(event) => handleFilterChange('category', event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                    <option value="">All categories</option>
                    {categories.filter(Boolean).map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
                <select
                    value={queryParams.status}
                    onChange={(event) => handleFilterChange('status', event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                    <option value="">All status</option>
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                </select>
                <select
                    value={queryParams.sort}
                    onChange={(event) => handleFilterChange('sort', event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                    <option value="">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="nameAsc">Name A-Z</option>
                    <option value="nameDesc">Name Z-A</option>
                    <option value="priceAsc">Price low to high</option>
                    <option value="priceDesc">Price high to low</option>
                </select>
            </div>

            {/* --- MAIN CONTENT --- */}
            {loading ? (
                <AdminLoadingState
                    title="Loading products"
                    description="We are fetching your catalog, stock, variants, pricing, and publish status."
                />
            ) : products?.length === 0 ? (
                <AdminEmptyState
                    icon={Package}
                    title="Add your first product"
                    description="Start with title, category, price, stock, and clear images. Draft products stay hidden until published."
                    action={(
                        <Link
                            to="/dashboard/products/add"
                            className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-all"
                        >
                            <Plus size={18} className="mr-2" /> Add Your First Product
                        </Link>
                    )}
                />
            ) : (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">

                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <Table
                            columns={columns}
                            data={products}
                            actions={renderActions}
                            className="w-full"
                        />
                    </div>

                    {/* Mobile View - Floating Cards approach for a native app feel */}
                    <div className="md:hidden bg-slate-50 p-4 space-y-4">
                        {products.map((p) => (
                            <div key={p._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4 relative overflow-hidden active:scale-[0.99] transition-transform">

                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0 relative">
                                        {p.images?.[0] ? (
                                            <img src={p.images[0]} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-300">
                                                <Package size={24} />
                                            </div>
                                        )}
                                        {/* Status Badge Overlaid on Mobile Image */}
                                        <div className={`absolute top-0 right-0 m-1 w-2.5 h-2.5 rounded-full border-2 border-white ${p.isActive ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <h3 className="font-semibold text-slate-900 truncate leading-tight">{p.title}</h3>
                                        <p className="text-xs text-slate-500 mt-1 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded-md self-start">
                                            {p.category || 'General'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-slate-900 font-bold text-sm">৳{p.finalPrice?.toLocaleString()}</span>
                                            {p.totalStock < 5 && p.totalStock > 0 && (
                                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center border border-amber-100">
                                                    Low Stock
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                        <Layers size={14} /> {p.variantCount ?? p.variants?.length ?? 0} variants
                                    </span>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => handleOpenDetails(p)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                                            <Eye size={16} strokeWidth={2}/>
                                        </button>
                                        <button onClick={() => handleEdit(p)} className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors">
                                            <Edit size={16} strokeWidth={2}/>
                                        </button>
                                        <button onClick={() => deleteProduct(p._id)} className="p-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors">
                                            <Trash2 size={16} strokeWidth={2}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && pagination.total > (pagination.limit || queryParams.limit) && (
                <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row">
                    <span>
                        Page {pagination.page} of {pagination.totalPages || pagination.pages} / {pagination.total} products
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(pagination.page - 1)}
                            disabled={!pagination.hasPrevPage && pagination.page <= 1}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => goToPage(pagination.page + 1)}
                            disabled={!pagination.hasNextPage && pagination.page >= (pagination.totalPages || pagination.pages)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
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
