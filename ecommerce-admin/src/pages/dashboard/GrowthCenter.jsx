import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    BarChart3,
    Copy,
    Eye,
    Lightbulb,
    Megaphone,
    MousePointerClick,
    Search,
    ShoppingCart,
    Sparkles,
    Target,
    TrendingUp
} from 'lucide-react';
import API from '../../api/api';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const rangeOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' }
];

const labelStyles = {
    winner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hidden_gem: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    fix_before_ads: 'bg-amber-50 text-amber-700 border-amber-200',
    checkout_problem: 'bg-rose-50 text-rose-700 border-rose-200',
    low_interest: 'bg-slate-100 text-slate-700 border-slate-200',
    not_enough_data: 'bg-slate-50 text-slate-500 border-slate-200'
};

const labelText = {
    winner: 'Winner',
    hidden_gem: 'Hidden gem',
    fix_before_ads: 'Fix before ads',
    checkout_problem: 'Checkout problem',
    low_interest: 'Low interest',
    not_enough_data: 'Needs data'
};

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatCurrency = (value) => `BDT ${Math.round(Number(value || 0)).toLocaleString()}`;
const formatRate = (value) => `${Number(value || 0).toFixed(1)}%`;

const StatCard = ({ title, value, icon: Icon, helper, tone = 'indigo' }) => {
    const toneClass = {
        indigo: 'bg-indigo-50 text-indigo-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        cyan: 'bg-cyan-50 text-cyan-700',
        rose: 'bg-rose-50 text-rose-700'
    }[tone];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-500">{title}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                    {helper && <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>}
                </div>
                <div className={`rounded-xl p-3 ${toneClass}`}>
                    <Icon size={21} />
                </div>
            </div>
        </div>
    );
};

const LabelBadge = ({ label }) => (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${labelStyles[label] || labelStyles.not_enough_data}`}>
        {labelText[label] || 'Needs data'}
    </span>
);

const GrowthCenter = () => {
    const [range, setRange] = useState('30');
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [products, setProducts] = useState([]);
    const [searchTerms, setSearchTerms] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [language, setLanguage] = useState('en');
    const [adCopy, setAdCopy] = useState(null);
    const [adCopyLoading, setAdCopyLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadGrowthData = async () => {
            setLoading(true);
            try {
                const params = { range };
                const [overviewRes, productsRes, searchRes, recommendationsRes] = await Promise.all([
                    API.get('/admin/growth/overview', { params }),
                    API.get('/admin/growth/products', { params }),
                    API.get('/admin/growth/search', { params }),
                    API.get('/admin/growth/recommendations', { params })
                ]);

                if (!isMounted) return;
                setOverview(overviewRes.data.data);
                setProducts(productsRes.data.data?.products || []);
                setSearchTerms(searchRes.data.data?.terms || []);
                setRecommendations(recommendationsRes.data.data?.recommendations || []);
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to load Growth Center');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadGrowthData();

        return () => {
            isMounted = false;
        };
    }, [range]);

    const summary = overview?.summary || {};
    const bestProduct = overview?.bestProduct?.product?.title || 'No winner yet';
    const needsAttention = overview?.needsAttention?.product?.title || 'Nothing urgent';

    const tableColumns = useMemo(() => [
        {
            key: 'product',
            label: 'Product',
            render: (row) => (
                <div className="max-w-[220px]">
                    <p className="truncate font-bold text-slate-950">{row.product?.title}</p>
                    <p className="truncate text-xs text-slate-500">{row.product?.category || 'Uncategorized'}</p>
                </div>
            )
        },
        { key: 'views', label: 'Views', render: row => formatNumber(row.views) },
        { key: 'addToCarts', label: 'Add to Cart', render: row => formatNumber(row.addToCarts) },
        { key: 'orders', label: 'Orders', render: row => formatNumber(row.orders) },
        { key: 'revenue', label: 'Revenue', render: row => formatCurrency(row.revenue) },
        { key: 'addToCartRate', label: 'Cart Rate', render: row => formatRate(row.addToCartRate) },
        { key: 'conversionRate', label: 'Conversion', render: row => formatRate(row.conversionRate) },
        { key: 'label', label: 'Label', render: row => <LabelBadge label={row.label} /> },
        {
            key: 'suggestedAction',
            label: 'Suggested Action',
            render: row => (
                <span className="block max-w-xs truncate text-slate-600">
                    {row.recommendation?.suggestedActions?.[0] || 'Keep monitoring'}
                </span>
            )
        }
    ], []);

    const openProductDetail = async (row) => {
        setDetailLoading(true);
        setAdCopy(null);
        try {
            const { data } = await API.get(`/admin/growth/products/${row.product._id}`, {
                params: { range }
            });
            setSelectedProduct(data.data);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to load product insight');
        } finally {
            setDetailLoading(false);
        }
    };

    const generateAdCopy = async () => {
        const productId = selectedProduct?.product?._id;
        if (!productId) return;

        setAdCopyLoading(true);
        try {
            const { data } = await API.post('/admin/growth/generate-ad-copy', {
                productId,
                language,
                campaignType: 'general'
            });
            setAdCopy(data.data);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to generate ad copy');
        } finally {
            setAdCopyLoading(false);
        }
    };

    const copyAdText = async (label, value) => {
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        } catch {
            toast.error('Could not copy text');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950">Growth Center</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        See which products deserve ads, which need fixing, and what customers search before buying.
                    </p>
                </div>
                <select
                    value={range}
                    onChange={(event) => setRange(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                    {rangeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    Loading Growth Center...
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard title="Product Views" value={formatNumber(summary.views)} icon={Eye} helper="Tracked storefront product views." />
                        <StatCard title="Add to Cart Rate" value={formatRate(summary.addToCartRate)} icon={MousePointerClick} tone="cyan" helper={`${formatNumber(summary.addToCarts)} add-to-cart events.`} />
                        <StatCard title="Order Conversion" value={formatRate(summary.conversionRate)} icon={TrendingUp} tone="emerald" helper={`${formatNumber(summary.orders)} product order events.`} />
                        <StatCard title="Revenue Tracked" value={formatCurrency(summary.revenue)} icon={ShoppingCart} tone="amber" helper="From tracked order events." />
                        <StatCard title="Checkout Rate" value={formatRate(rateSafe(summary.checkouts, summary.addToCarts))} icon={BarChart3} tone="indigo" helper={`${formatNumber(summary.checkouts)} checkout starts.`} />
                        <StatCard title="Best Product" value={bestProduct} icon={Sparkles} tone="emerald" helper="Highest current performance signal." />
                        <StatCard title="Needs Attention" value={needsAttention} icon={Megaphone} tone="rose" helper="Fix before spending on ads." />
                        <StatCard title="Search Terms" value={formatNumber(searchTerms.length)} icon={Search} tone="cyan" helper="Unique terms in this period." />
                    </div>

                    <section className="space-y-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Product Performance</h2>
                            <p className="mt-1 text-sm text-slate-500">Click Insight to inspect the funnel and generate simple ad copy.</p>
                        </div>
                        <Table
                            columns={tableColumns}
                            data={products}
                            emptyTitle="No growth data yet"
                            emptyDescription="Visit products, add to cart, search, and place orders from the storefront to start collecting analytics."
                            actions={(row) => (
                                <Button variant="secondary" size="sm" onClick={() => openProductDetail(row)}>
                                    Insight
                                </Button>
                            )}
                        />
                    </section>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <Search size={18} className="text-indigo-600" />
                                <h2 className="font-black text-slate-950">Search Analytics</h2>
                            </div>
                            <div className="space-y-3">
                                {searchTerms.length === 0 ? (
                                    <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-500">No storefront searches tracked yet.</p>
                                ) : searchTerms.slice(0, 8).map(term => (
                                    <div key={term.query} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
                                        <div>
                                            <p className="font-bold text-slate-900">{term.query}</p>
                                            <p className="text-xs text-slate-500">
                                                {term.zeroResultCount} zero-result searches
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                                            {term.searchCount} searches
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <Megaphone size={18} className="text-indigo-600" />
                                <h2 className="font-black text-slate-950">Ad Recommendations</h2>
                            </div>
                            <div className="space-y-3">
                                {recommendations.length === 0 ? (
                                    <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-500">Recommendations appear after products collect enough funnel activity.</p>
                                ) : recommendations.slice(0, 6).map(item => (
                                    <div key={item.product?._id} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-bold text-slate-950">{item.product?.title}</p>
                                            <LabelBadge label={item.label} />
                                        </div>
                                        <p className="mt-2 text-sm text-slate-600">{item.adRecommendation}: {item.reason}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{item.suggestedAdAngle}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </>
            )}

            <Modal
                isOpen={Boolean(selectedProduct) || detailLoading}
                onClose={() => {
                    setSelectedProduct(null);
                    setAdCopy(null);
                }}
                title={selectedProduct?.product?.title || 'Product Insight'}
            >
                {detailLoading || !selectedProduct ? (
                    <div className="text-sm text-slate-500">Loading product insight...</div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <MiniMetric label="Views" value={formatNumber(selectedProduct.metrics.views)} />
                            <MiniMetric label="Add to Cart" value={formatNumber(selectedProduct.metrics.addToCarts)} />
                            <MiniMetric label="Orders" value={formatNumber(selectedProduct.metrics.orders)} />
                            <MiniMetric label="Revenue" value={formatCurrency(selectedProduct.metrics.revenue)} />
                            <MiniMetric label="Cart Rate" value={formatRate(selectedProduct.metrics.addToCartRate)} />
                            <MiniMetric label="Conversion" value={formatRate(selectedProduct.metrics.conversionRate)} />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <h3 className="font-black text-slate-950">Recommendation</h3>
                                <LabelBadge label={selectedProduct.metrics.label || selectedProduct.metrics.recommendation?.label} />
                            </div>
                            <p className="text-sm text-slate-600">{selectedProduct.metrics.recommendation?.message}</p>
                            <ul className="mt-3 space-y-2 text-sm text-slate-700">
                                {(selectedProduct.metrics.recommendation?.suggestedActions || []).map(action => (
                                    <li key={action} className="flex gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                        <span>{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="font-black text-slate-950">Ad Copy Helper</h3>
                                    <p className="text-xs text-slate-500">Template-based copy. No ad account connection needed.</p>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={language}
                                        onChange={(event) => setLanguage(event.target.value)}
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                                    >
                                        <option value="en">English</option>
                                        <option value="bn">Bangla</option>
                                        <option value="banglish">Banglish</option>
                                    </select>
                                    <Button size="sm" onClick={generateAdCopy} isLoading={adCopyLoading}>
                                        Generate
                                    </Button>
                                </div>
                            </div>
                            {adCopy && (
                                <div className="space-y-4">
                                    <AdHelperSection
                                        icon={Megaphone}
                                        title="Ad Copy"
                                        helper="Use these fields when creating a Facebook or Instagram ad."
                                    >
                                        <AdCopyRow
                                            label="Primary caption"
                                            value={adCopy.primaryText}
                                            onCopy={() => copyAdText('Primary caption', adCopy.primaryText)}
                                        />
                                        <AdCopyRow
                                            label="Headline"
                                            value={adCopy.headline}
                                            onCopy={() => copyAdText('Headline', adCopy.headline)}
                                        />
                                        <AdCopyRow
                                            label="Description"
                                            value={adCopy.description}
                                            onCopy={() => copyAdText('Description', adCopy.description)}
                                        />
                                        <div className="rounded-lg bg-white p-3">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">CTA</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-800">{adCopy.callToAction}</p>
                                        </div>
                                    </AdHelperSection>

                                    <AdHelperSection
                                        icon={Target}
                                        title="Target Audience"
                                        helper="Estimated targeting ideas based on product data and your store analytics."
                                    >
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <AdInfoBlock label="Targeted customer" value={adCopy.targetedCustomer} />
                                            <AdInfoBlock label="Age range" value={adCopy.targetedAgeRange} />
                                        </div>
                                        <AdChipList label="Suggested interests" items={adCopy.suggestedInterests} />
                                        <AdChipList label="Location focus" items={adCopy.suggestedLocationFocus} />
                                    </AdHelperSection>

                                    <AdHelperSection
                                        icon={Lightbulb}
                                        title="Ad Strategy"
                                        helper="Use this before spending money so the product has the right campaign angle."
                                    >
                                        <AdInfoBlock label="Ad angle" value={adCopy.adAngle} />
                                        <AdInfoBlock label="Why this audience fits" value={adCopy.audienceReason} />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Improvement suggestions</p>
                                            <ul className="mt-2 space-y-2 text-sm text-slate-700">
                                                {(adCopy.improvementSuggestions || []).map(item => (
                                                    <li key={item} className="flex gap-2 rounded-lg bg-white px-3 py-2">
                                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </AdHelperSection>

                                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                                        Audience suggestions are estimated from product type, store analytics, and order behavior. They do not use private Facebook or Instagram profile data.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const rateSafe = (part, total) => total > 0 ? (part / total) * 100 : 0;

const MiniMetric = ({ label, value }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
);

const AdHelperSection = ({ icon: Icon, title, helper, children }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-start gap-3">
            <div className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">
                <Icon size={18} />
            </div>
            <div>
                <h4 className="font-black text-slate-950">{title}</h4>
                <p className="text-xs leading-5 text-slate-500">{helper}</p>
            </div>
        </div>
        <div className="space-y-3">{children}</div>
    </div>
);

const AdCopyRow = ({ label, value, onCopy }) => (
    <div className="rounded-lg bg-white p-3">
        <div className="mb-1 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <Button size="sm" variant="secondary" onClick={onCopy} className="min-h-8 px-2 py-1">
                <Copy size={14} />
                Copy
            </Button>
        </div>
        <p className="text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
);

const AdInfoBlock = ({ label, value }) => (
    <div className="rounded-lg bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value || 'Not enough data yet'}</p>
    </div>
);

const AdChipList = ({ label, items = [] }) => (
    <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-2 flex flex-wrap gap-2">
            {items.length === 0 ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">Not enough data yet</span>
            ) : items.map(item => (
                <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                    {item}
                </span>
            ))}
        </div>
    </div>
);

export default GrowthCenter;
