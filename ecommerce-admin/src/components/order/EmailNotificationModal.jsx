import { useState, useEffect } from 'react';
import { X, Mail, Send, Check } from 'lucide-react';

const EmailNotificationModal = ({ isOpen, onClose, onConfirm, order, newStatus }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Pre-fill the email template based on the status change
    useEffect(() => {
        if (order && newStatus) {
            setSubject(`Order Update: Your order is now ${newStatus}`);

            let defaultMessage = `Hello ${order.customer?.fullName || 'Customer'},\n\n`;
            defaultMessage += `We wanted to let you know that the status of your order (#${order._id}) has been updated to: ${newStatus}.\n\n`;

            if (newStatus === 'Shipped') {
                defaultMessage += "Your package is on its way! We will notify you once it's out for delivery.\n\n";
            } else if (newStatus === 'Delivered') {
                defaultMessage += "Your package has been successfully delivered. We hope you enjoy your purchase!\n\n";
            }

            defaultMessage += `Thank you for shopping with us!`;

            setMessage(defaultMessage);
        }
    }, [order, newStatus]);

    if (!isOpen || !order) return null;

    const handleYes = async () => {
        setIsProcessing(true);
        await onConfirm(true, { subject, message });
        setIsProcessing(false);
    };

    const handleNo = async () => {
        setIsProcessing(true);
        await onConfirm(false);
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Mail className="text-indigo-600" size={20} />
                        <h3 className="font-semibold text-gray-900">Notify Customer?</h3>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition" disabled={isProcessing}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <p className="text-sm text-gray-600">
                        You are changing order <strong>#{order._id.slice(-6).toUpperCase()}</strong> to <span className="font-bold text-indigo-600">{newStatus}</span>.
                        Would you like to send an email notification to <strong>{order.customer?.email}</strong>?
                    </p>

                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 border outline-none bg-white"
                                disabled={isProcessing}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 border outline-none resize-none bg-white"
                                disabled={isProcessing}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleNo}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-lg hover:bg-gray-200 flex items-center gap-1.5 transition"
                        disabled={isProcessing}
                    >
                        <Check size={16} /> No, Just Update
                    </button>
                    <button
                        onClick={handleYes}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-70 transition"
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <span className="animate-pulse">Processing...</span>
                        ) : (
                            <><Send size={16} /> Yes, Send Email</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailNotificationModal;