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
            await API.post(endpoint, {
                subject,
                message,
                ...(mode === 'product' ? { productId } : {})
            });
            toast.success('Email campaign queued.');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to queue email campaign.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-950">
                            {mode === 'product' ? 'Send product email' : 'Email all customers'}
                        </h3>
                        <p className="text-sm text-slate-500">{recipientCount} recipients from this shop.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid max-h-[75vh] gap-5 overflow-y-auto p-6 lg:grid-cols-[1fr_260px]">
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
                    </aside>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={sending} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button disabled={sending} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
                        {sending ? 'Queueing...' : `Send to ${recipientCount} customers`}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomerCampaignModal;
