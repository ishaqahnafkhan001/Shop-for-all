"use client";

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { PackageX } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useShopData } from '@/hooks/useShopData';
import { normalizeTheme } from '@/lib/theme';
import { ReferenceStorefrontHome } from '@/components/storefront/ReferenceStorefront';

export default function VendorHomePage({ params }) {
    const { subdomain } = React.use(params);
    const { addToCart } = useCart();
    const [filters, setFilters] = useState({ category: 'All', minPrice: '', maxPrice: '', sort: 'newest', page: 1 });
    const [priceInput, setPriceInput] = useState({ min: '', max: '' });
    const [catalogSearch, setCatalogSearch] = useState('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const { shop, products, categories, sectionProducts, loading, error, pagination } = useShopData(subdomain, filters);
    const theme = normalizeTheme(shop?.theme || {});
    const storewideDiscount = shop?.storewideDiscount || 0;

    const handleCategoryChange = useCallback((category) => {
        setFilters(prev => ({ ...prev, category, page: 1 }));
        setMobileFiltersOpen(false);
    }, []);

    const handleSortChange = useCallback((event) => {
        setFilters(prev => ({ ...prev, sort: event.target.value, page: 1 }));
    }, []);

    const handlePriceApply = useCallback(() => {
        setFilters(prev => ({ ...prev, minPrice: priceInput.min, maxPrice: priceInput.max, page: 1 }));
        setMobileFiltersOpen(false);
    }, [priceInput]);

    const handleClearFilters = useCallback(() => {
        setPriceInput({ min: '', max: '' });
        setFilters({ category: 'All', minPrice: '', maxPrice: '', sort: 'newest', page: 1 });
        setMobileFiltersOpen(false);
    }, []);

    const handlePageChange = useCallback((page) => {
        setFilters(prev => ({ ...prev, page }));
        window.scrollTo({ top: 520, behavior: 'smooth' });
    }, []);

    if (error) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                <PackageX size={48} className="mb-4 text-slate-300" />
                <h2 className="mb-2 text-xl font-black text-slate-950">Store Unavailable</h2>
                <p className="text-sm text-slate-500">This storefront is currently inactive or does not exist.</p>
            </div>
        );
    }

    return (
        <ReferenceStorefrontHome
            theme={theme}
            products={products}
            categories={categories}
            sectionProducts={sectionProducts}
            storewideDiscount={storewideDiscount}
            loading={loading}
            pagination={pagination}
            filters={filters}
            priceInput={priceInput}
            catalogSearch={catalogSearch}
            mobileFiltersOpen={mobileFiltersOpen}
            onCatalogSearchChange={event => setCatalogSearch(event.target.value)}
            onSortChange={handleSortChange}
            onFilterOpen={() => setMobileFiltersOpen(true)}
            onFilterClose={() => setMobileFiltersOpen(false)}
            onCategoryChange={handleCategoryChange}
            onMinPriceChange={event => setPriceInput(prev => ({ ...prev, min: event.target.value }))}
            onMaxPriceChange={event => setPriceInput(prev => ({ ...prev, max: event.target.value }))}
            onPriceApply={handlePriceApply}
            onClearFilters={handleClearFilters}
            onPageChange={handlePageChange}
            onProductAdd={addToCart}
            LinkComponent={Link}
        />
    );
}
