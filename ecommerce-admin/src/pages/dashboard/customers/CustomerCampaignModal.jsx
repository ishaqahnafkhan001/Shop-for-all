import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';

const CustomerCampaignModal = ({
    isOpen,
    onClose,
    mode = 'plain',
    recipientCount = 0,
    shopName = 'Your store'
}) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [productId, setProductId] = useState('');
    const [products, setProducts] = useState([]);
    const [sending, setSending] = useState(false);
    const [eligibleCount, setEligibleCount] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [historyError, setHistoryError] = useState('');
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [recipientPage, setRecipientPage] = useState(1);
    const [recipientPages, setRecipientPages] = useState(0);
    const [recipientTotal, setRecipientTotal] = useState(0);

    useEffect(() => {
        if (!isOpen) return undefined;
        let active = true;
        const load = () => API.get('/admin/customers/email-campaigns')
            .then(({ data }) => {
                if (!active) return;
                setCampaigns(data.data || []);
                setEligibleCount(data.eligibleRecipientCount ?? 0);
                setHistoryError('');
            })
            .catch(() => { if (active) setHistoryError('Campaign history is temporarily unavailable.'); });
        load();
        const timer = setInterval(load, 10000);
        return () => { active = false; clearInterval(timer); };
    }, [isOpen]);

    useEffect(() => {
        if (!selectedCampaignId) return undefined;
        let active = true;
        const load = () => API.get(`/admin/customers/email-campaigns/${selectedCampaignId}/recipients`, { params: { page: recipientPage } })
            .then(({ data }) => {
                if (!active) return;
                setRecipients(data.data || []);
                setRecipientPages(data.pages || 0);
                setRecipientTotal(data.total || 0);
            })
            .catch(() => { if (active) setRecipients([]); });
        load();
        const timer = setInterval(load, 10000);
        return () => { active = false; clearInterval(timer); };
    }, [selectedCampaignId, recipientPage]);

    useEffect(() => {
        if (!isOpen) return;
        queueMicrotask(() => {
            setSubject(mode === 'product' ? 'A product picked for you' : '');
            setMessage('');
            setProductId('');
        });

        if (mode === 'product') {
            API.get('/admin/products', { params: { limit: 50, status: 'Published' } })
                .then(response => setProducts(response.data.data || []))
                .catch(() => setProducts([]));
        }
    }, [isOpen, mode]);

    const selectedProduct = useMemo(
        () => products.find(product => product._id === productId),
        [products, productId]
    );

    if (!isOpen) return null;

    const submit = async (event) => {
        event.preventDefault();
        if (!subject.trim()) return toast.error('Subject is required.');
        if (mode === 'plain' && !message.trim()) return toast.error('Message is required.');
        if (mode === 'product' && !productId) return toast.error('Select a product first.');

        setSending(true);
        try {
            const endpoint = mode === 'product'
                ? '/admin/customers/product-email-campaigns'
                : '/admin/customers/email-campaigns';
            const response = await API.post(endpoint, {
                subject,
                message,
                ...(mode === 'product' ? { productId } : {})
            });
            toast.success(`Campaign queued for ${response.data?.data?.recipientCount ?? 0} consented customers.`);
            API.get('/admin/customers/email-campaigns').then(({ data }) => {
                setCampaigns(data.data || []);
                setEligibleCount(data.eligibleRecipientCount ?? 0);
            }).catch(() => setHistoryError('Campaign queued; refresh history to see progress.'));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to queue email campaign.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <form onSubmit={submit} className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-950">
                            {mode === 'product' ? 'Send product email' : 'Email subscribed customers'}
                        </h3>
                        <p className="text-sm text-slate-500">{eligibleCount ?? '…'} customers opted in to marketing emails. {recipientCount} total customers.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close campaign modal" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid flex-1 gap-5 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[1fr_260px]">
                    <div className="space-y-4">
                        {mode === 'product' && (
                            <label className="block">
                                <span className="mb-1 block text-sm font-bold text-slate-700">Product</span>
                                <select
                                    value={productId}
                                    onChange={event => setProductId(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    required
                                >
                                    <option value="">Select a product</option>
                                    {products.map(product => (
                                        <option key={product._id} value={product._id}>{product.title}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label className="block">
                            <span className="mb-1 block text-sm font-bold text-slate-700">Subject</span>
                            <input
                                value={subject}
                                onChange={event => setSubject(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                maxLength={160}
                                required
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-sm font-bold text-slate-700">
                                {mode === 'product' ? 'Intro message optional' : 'Message'}
                            </span>
                            <textarea
                                value={message}
                                onChange={event => setMessage(event.target.value)}
                                rows={7}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                placeholder={mode === 'product' ? 'Add a short note before the product card.' : 'Write your customer update, offer, or announcement.'}
                                required={mode === 'plain'}
                            />
                        </label>
                    </div>

                    <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Preview</p>
                        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{shopName}</p>
                            <h4 className="mt-1 text-base font-black text-slate-950">{subject || 'Email subject'}</h4>
                            {message && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">{message}</p>}
                            {mode === 'product' && selectedProduct && (
                                <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                                    {selectedProduct.images?.[0] && <img src={selectedProduct.images[0]} alt="" className="h-28 w-full object-cover" />}
                                    <div className="p-3">
                                        <p className="font-bold text-slate-900">{selectedProduct.title}</p>
                                        <p className="mt-1 text-sm font-black text-slate-950">৳{selectedProduct.finalPrice?.toLocaleString?.() || selectedProduct.pricing?.sellingPrice}</p>
                                        <span className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white">View Product</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-5 border-t border-slate-200 pt-4" aria-live="polite">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Recent campaigns · refreshes every 10 seconds</p>
                            {historyError && <p className="mt-2 text-xs text-rose-700">{historyError}</p>}
                            {!historyError && campaigns.length === 0 && <p className="mt-2 text-xs text-slate-500">No campaigns yet.</p>}
                            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                                {campaigns.map(campaign => (
                                    <button key={campaign._id} type="button" onClick={() => { setSelectedCampaignId(campaign._id); setRecipientPage(1); }} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left text-xs hover:border-indigo-300">
                                        <span className="block truncate font-bold text-slate-800">{campaign.subject}</span>
                                        <span className="text-slate-500">{campaign.status} · {campaign.sentCount} accepted · {campaign.deliveredCount} delivered · {campaign.failedCount} failed · {campaign.uncertainCount} uncertain · {campaign.skippedCount} skipped / {campaign.recipientCount} total</span>
                                    </button>
                                ))}
                            </div>
                            {selectedCampaignId && <div className="mt-3 max-h-36 overflow-y-auto rounded-lg bg-white p-2 text-xs">
                                <p className="font-bold text-slate-700">Recipient outcomes ({recipientTotal})</p>
                                {recipients.map(row => <p key={row.id} className="py-1 text-slate-600">{row.email} · {row.status}</p>)}
                                {recipientPages > 1 && <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                                    <button type="button" disabled={recipientPage <= 1} onClick={() => setRecipientPage(page => page - 1)} className="disabled:opacity-40">Previous</button>
                                    <span>{recipientPage} / {recipientPages}</span>
                                    <button type="button" disabled={recipientPage >= recipientPages} onClick={() => setRecipientPage(page => page + 1)} className="disabled:opacity-40">Next</button>
                                </div>}
                            </div>}
                        </div>
                    </aside>
                </div>

                <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button type="button" onClick={onClose} disabled={sending} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button disabled={sending || eligibleCount === null || eligibleCount === 0} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
                        {sending ? 'Queueing...' : `Queue for ${eligibleCount ?? '…'} subscribers`}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomerCampaignModal;
