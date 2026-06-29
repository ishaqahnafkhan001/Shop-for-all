import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search, Eye, Trash2, Image as ImageIcon, Video, X } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../api/api';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const statusOptions = ['All', 'Requested', 'Approved', 'Rejected', 'Received', 'Refunded', 'Cancelled', 'Closed'];
const nextStatuses = {
    Requested: ['Approved', 'Rejected', 'Cancelled'],
    Approved: ['Received', 'Rejected', 'Cancelled'],
    Received: ['Refunded', 'Closed'],
    Refunded: ['Closed'],
    Rejected: ['Closed'],
    Cancelled: [],
    Closed: []
};

const formatMoney = (value) => `৳ ${Number(value || 0).toLocaleString('en-BD')}`;
const shortId = (value) => `#${String(value || '').slice(-6).toUpperCase()}`;

const Returns = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('All');
    const [orderId, setOrderId] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ orderId: '', reason: '', customerNote: '' });
    const [proofImages, setProofImages] = useState([]);
    const [proofVideo, setProofVideo] = useState(null);
    const [refundForm, setRefundForm] = useState({ status: 'Pending', amount: '', method: '', reference: '', note: '' });

    const fetchReturns = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/returns', {
                params: {
                    page,
                    limit: 25,
                    status,
                    ...(orderId.trim() ? { orderId: orderId.trim() } : {})
                }
            });
            setReturns(data.data || []);
            setPagination(data.pagination || { page, pages: 1, total: 0 });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load returns');
        } finally {
            setLoading(false);
        }
    }, [orderId, status]);

    useEffect(() => {
        const timer = window.setTimeout(() => fetchReturns(1), 0);
        return () => window.clearTimeout(timer);
    }, [fetchReturns]);

    const selectedNextStatuses = useMemo(() => nextStatuses[selectedReturn?.status] || [], [selectedReturn]);

    const createReturn = async (event) => {
        event.preventDefault();
        if (proofImages.length < 1) {
            toast.error('Upload at least one proof image.');
            return;
        }
        if (proofImages.length > 3) {
            toast.error('You can upload up to 3 proof images.');
            return;
        }

        const payload = new FormData();
        payload.append('orderId', form.orderId);
        payload.append('reason', form.reason);
        payload.append('customerNote', form.customerNote || '');
        proofImages.forEach(file => payload.append('proofImages', file));
        if (proofVideo) payload.append('proofVideo', proofVideo);

        setSaving(true);
        try {
            await API.post('/admin/returns', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Return request created');
            setCreateOpen(false);
            setForm({ orderId: '', reason: '', customerNote: '' });
            setProofImages([]);
            setProofVideo(null);
            fetchReturns(1);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create return');
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (returnId, nextStatus) => {
        try {
            const { data } = await API.patch(`/admin/returns/${returnId}/status`, { status: nextStatus });
            toast.success('Return status updated');
            setSelectedReturn(data.data);
            fetchReturns(pagination.page);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update status');
        }
    };

    const updateRefund = async (event) => {
        event.preventDefault();
        if (!selectedReturn) return;
        setSaving(true);
        try {
            const payload = {
                ...refundForm,
                amount: refundForm.amount === '' ? selectedReturn.refund?.amount : Number(refundForm.amount)
            };
            const { data } = await API.patch(`/admin/returns/${selectedReturn._id}/refund`, payload);
            toast.success('Refund details updated');
            setSelectedReturn(data.data);
            fetchReturns(pagination.page);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update refund');
        } finally {
            setSaving(false);
        }
    };

    const deleteReturn = async (returnId) => {
        if (!confirm('Delete this requested return? Only returns in Requested status can be deleted.')) return;
        try {
            await API.delete('/admin/returns', { data: { ids: [returnId] } });
            toast.success('Return request deleted');
            fetchReturns(pagination.page);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete return');
        }
    };

    const openDetails = (item) => {
        setSelectedReturn(item);
        setRefundForm({
            status: item.refund?.status || 'Pending',
            amount: item.refund?.amount ?? '',
            method: item.refund?.method || '',
            reference: item.refund?.reference || '',
            note: item.refund?.note || ''
        });
    };

    const handleImageChange = (event) => {
        const files = Array.from(event.target.files || []);
        const next = [...proofImages, ...files].slice(0, 3);
        if (proofImages.length + files.length > 3) toast.error('Only the first 3 proof images were added.');
        setProofImages(next);
        event.target.value = '';
    };

    const columns = [
        {
            key: 'order',
            label: 'Order',
            render: (row) => (
                <div>
                    <p className="font-mono font-semibold text-indigo-700">{shortId(row.order_id?._id || row.order_id)}</p>
                    <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</p>
                </div>
            )
        },
        {
            key: 'customer',
            label: 'Customer',
            render: (row) => (
                <div>
                    <p className="font-medium text-slate-900">{row.customer_id?.fullName || 'Customer'}</p>
                    <p className="text-xs text-slate-500">{row.customer_id?.email}</p>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {row.status}
                </span>
            )
        },
        {
            key: 'refund',
            label: 'Refund',
            render: (row) => (
                <div>
                    <p className="font-semibold text-slate-900">{formatMoney(row.refund?.amount)}</p>
                    <p className="text-xs text-slate-500">{row.refund?.status || 'Pending'}</p>
                </div>
            )
        },
        {
            key: 'reason',
            label: 'Reason',
            render: (row) => <span className="max-w-xs truncate text-slate-700">{row.reason}</span>
        }
    ];

    const renderActions = (row) => (
        <div className="flex justify-end gap-2">
            <button
                onClick={() => openDetails(row)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
                <Eye size={16} /> View
            </button>
            {row.status === 'Requested' && (
                <button
                    onClick={() => deleteReturn(row._id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                    <Trash2 size={16} /> Delete
                </button>
            )}
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-700">
                        <RefreshCcw size={16} /> Returns and refunds
                    </div>
                    <h1 className="mt-2 text-2xl font-bold text-slate-950">Return Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Track return requests and record manual refunds without touching payment gateways.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>Create return</Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={orderId}
                            onChange={(event) => setOrderId(event.target.value)}
                            placeholder="Filter by full order ID"
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                        {statusOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <Button variant="secondary" onClick={() => fetchReturns(1)}>Refresh</Button>
                </div>
            </div>

            {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">Loading returns...</div>
            ) : (
                <Table
                    columns={columns}
                    data={returns}
                    actions={renderActions}
                    emptyTitle="No return requests"
                    emptyDescription="Create a return from an existing order when a customer asks for refund or replacement support."
                />
            )}

            {(pagination.totalPages || pagination.pages || 1) > 1 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span>Page {pagination.page} of {pagination.totalPages || pagination.pages} · {pagination.total} returns</span>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.hasPrevPage === false || pagination.page <= 1}
                            onClick={() => fetchReturns(pagination.page - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.hasNextPage === false || pagination.page >= (pagination.totalPages || pagination.pages)}
                            onClick={() => fetchReturns(pagination.page + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create return request">
                <form onSubmit={createReturn} className="space-y-4">
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Order ID</span>
                        <input
                            value={form.orderId}
                            onChange={(event) => setForm(prev => ({ ...prev, orderId: event.target.value }))}
                            required
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Paste the full order ID"
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Reason</span>
                        <input
                            value={form.reason}
                            onChange={(event) => setForm(prev => ({ ...prev, reason: event.target.value }))}
                            required
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Wrong size, damaged item, customer request..."
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Customer note</span>
                        <textarea
                            value={form.customerNote}
                            onChange={(event) => setForm(prev => ({ ...prev, customerNote: event.target.value }))}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="Optional note from the customer"
                        />
                    </label>
                    <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                        By default all order items are included. You can adjust item-level workflows later without losing this request history.
                    </p>
                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start gap-2">
                            <ImageIcon size={18} className="mt-0.5 text-indigo-600" />
                            <div>
                                <p className="text-sm font-bold text-slate-900">Proof files</p>
                                <p className="text-xs leading-5 text-slate-500">Upload at least 1 proof image. You can upload up to 3 images. Video is optional.</p>
                            </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                Add proof images
                                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} className="hidden" />
                            </label>
                            <label className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                Add optional video
                                <input type="file" accept="video/mp4,video/quicktime" onChange={event => setProofVideo(event.target.files?.[0] || null)} className="hidden" />
                            </label>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            {proofImages.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                    <img src={URL.createObjectURL(file)} alt={file.name} className="h-24 w-full object-cover" />
                                    <button type="button" onClick={() => setProofImages(prev => prev.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-white p-1 text-slate-600 shadow">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {proofVideo && (
                                <div className="relative flex h-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                                    <Video size={20} className="mr-1 shrink-0" />
                                    <span className="truncate">{proofVideo.name}</span>
                                    <button type="button" onClick={() => setProofVideo(null)} className="absolute right-1 top-1 rounded-full bg-white p-1 text-slate-600 shadow">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={saving} disabled={proofImages.length < 1}>Create return</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(selectedReturn)} onClose={() => setSelectedReturn(null)} title="Return details">
                {selectedReturn && (
                    <div className="space-y-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Return</p>
                                    <p className="font-mono text-sm font-semibold text-slate-900">{shortId(selectedReturn._id)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Order</p>
                                    <p className="font-mono text-sm font-semibold text-slate-900">{shortId(selectedReturn.order_id?._id || selectedReturn.order_id)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Customer</p>
                                    <p className="text-sm font-semibold text-slate-900">{selectedReturn.customer_id?.fullName || 'Customer'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Status</p>
                                    <p className="text-sm font-semibold text-slate-900">{selectedReturn.status}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-950">Items</h3>
                            <div className="mt-2 space-y-2">
                                {(selectedReturn.items || []).map((item) => (
                                    <div key={`${item.productId}-${item.variantId}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                                        <div>
                                            <p className="font-semibold text-slate-900">{item.title}</p>
                                            <p className="text-xs text-slate-500">Qty {item.quantity} · {item.sku || 'No SKU'}</p>
                                        </div>
                                        <p className="font-semibold text-slate-900">{formatMoney(item.refundAmount)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {(selectedReturn.proof?.images?.length > 0 || selectedReturn.proof?.video?.url) && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-950">Proof files</h3>
                                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                                    {(selectedReturn.proof?.images || []).map((image, index) => (
                                        <a
                                            key={image.publicId || image.url || index}
                                            href={image.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                                        >
                                            <img src={image.url} alt={`Return proof ${index + 1}`} className="h-28 w-full object-cover" />
                                        </a>
                                    ))}
                                    {selectedReturn.proof?.video?.url && (
                                        <a
                                            href={selectedReturn.proof.video.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex h-28 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600"
                                        >
                                            <Video size={20} className="mr-2" />
                                            View video
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2">
                            {selectedNextStatuses.map(option => (
                                <Button key={option} variant="secondary" onClick={() => updateStatus(selectedReturn._id, option)}>
                                    Mark {option}
                                </Button>
                            ))}
                        </div>

                        <form onSubmit={updateRefund} className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-bold text-slate-950">Manual refund record</h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <select
                                    value={refundForm.status}
                                    onChange={(event) => setRefundForm(prev => ({ ...prev, status: event.target.value }))}
                                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                    {['NotRequired', 'Pending', 'Refunded', 'Failed'].map(option => <option key={option}>{option}</option>)}
                                </select>
                                <input
                                    value={refundForm.amount}
                                    onChange={(event) => setRefundForm(prev => ({ ...prev, amount: event.target.value }))}
                                    type="number"
                                    min="0"
                                    placeholder="Amount"
                                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <input
                                    value={refundForm.method}
                                    onChange={(event) => setRefundForm(prev => ({ ...prev, method: event.target.value }))}
                                    placeholder="Method, e.g. bKash"
                                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <input
                                    value={refundForm.reference}
                                    onChange={(event) => setRefundForm(prev => ({ ...prev, reference: event.target.value }))}
                                    placeholder="Transaction/reference"
                                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                            <textarea
                                value={refundForm.note}
                                onChange={(event) => setRefundForm(prev => ({ ...prev, note: event.target.value }))}
                                rows={2}
                                placeholder="Internal refund note"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex justify-end">
                                <Button type="submit" isLoading={saving}>Save refund</Button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Returns;
