import { useState, useEffect } from 'react';
import { X, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';

const PathaoSyncModal = ({ isOpen, onClose, order, onSyncSuccess, onJustConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        recipient_name: '',
        recipient_phone: '',
        recipient_address: '',
        amount_to_collect: 0,
        item_weight: '0.5',
        special_instruction: ''
    });

    // Populate form when order changes
    useEffect(() => {
        if (order) {
            queueMicrotask(() => {
                setFormData({
                    recipient_name: order.shipping?.address?.fullName || order.customer?.fullName || '',
                    recipient_phone: order.shipping?.address?.phone || '',
                    recipient_address: `${order.shipping?.address?.addressLine || ''}, ${order.shipping?.address?.city || ''}`.trim().replace(/^,|,$/g, ''),
                    amount_to_collect: order.payment?.method === 'COD' ? order.pricing?.total : 0,
                    item_weight: '0.5',
                    special_instruction: order.notes || ''
                });
            });
        }
    }, [order]);

    if (!isOpen || !order) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSyncPathao = async () => {
        if (!formData.recipient_name || !formData.recipient_phone || !formData.recipient_address) {
            return toast.error("Please fill in all required fields");
        }

        setLoading(true);
        try {
            const { data } = await API.post(`/admin/orders/${order._id}/pathao`, formData);
            toast.success(data.message);
            onSyncSuccess(data.data); // Update main table state
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to sync with Pathao");
        } finally {
            setLoading(false);
        }
    };

    // Shared input styling to ensure fields are visible
    const inputClass = "w-full p-2.5 mt-1 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-red-50">
                    <h2 className="text-lg font-bold text-red-700 flex items-center">
                        <Truck className="mr-2" size={20} /> Sync Order to Pathao
                    </h2>
                    <button onClick={onClose} className="text-red-400 hover:text-red-700 transition p-1 rounded-full hover:bg-red-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    <div className="bg-blue-50 p-3 rounded-lg flex items-start text-sm text-blue-800 border border-blue-100">
                        <AlertCircle className="shrink-0 mr-2 mt-0.5" size={16} />
                        <p>Review and modify details before creating the consignment in Pathao.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700">Recipient Name</label>
                            <input type="text" name="recipient_name" value={formData.recipient_name} onChange={handleChange} className={inputClass} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700">Phone Number</label>
                                <input type="text" name="recipient_phone" value={formData.recipient_phone} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700">Weight (KG)</label>
                                <input type="number" step="0.1" name="item_weight" value={formData.item_weight} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700">Full Delivery Address</label>
                            <textarea name="recipient_address" rows="3" value={formData.recipient_address} onChange={handleChange} className={`${inputClass} resize-none`} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700">Amount to Collect (৳)</label>
                                <input type="number" name="amount_to_collect" value={formData.amount_to_collect} onChange={handleChange} className={`${inputClass} font-bold text-indigo-600 bg-gray-50`} />
                                <span className="text-[10px] text-gray-500 mt-1 block">Set 0 if Already Paid</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700">Special Instructions (Optional)</label>
                            <input type="text" name="special_instruction" placeholder="e.g. Deliver before 5PM" value={formData.special_instruction} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                        onClick={onJustConfirm}
                        disabled={loading}
                        className="text-sm font-bold text-gray-600 hover:text-gray-900 transition underline w-full sm:w-auto text-center"
                    >
                        Skip & Confirm Order Only
                    </button>

                    <button
                        onClick={handleSyncPathao}
                        disabled={loading}
                        style={{ backgroundColor: '#dc2626' }} /* Fallback inline style for guaranteed Red BG */
                        className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center shadow-md shadow-red-200"
                    >
                        {loading ? 'Creating...' : 'Confirm & Send to Pathao'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PathaoSyncModal;
