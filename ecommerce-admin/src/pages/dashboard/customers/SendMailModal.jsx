import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';

// Add shopName to your props
const SendMailModal = ({ isOpen, onClose, customer, shopName }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    // console.log("name",shopName)

    useEffect(() => {
        if (isOpen) {
            queueMicrotask(() => {
                setSubject('');
                setMessage('');
            });
        }
    }, [isOpen, customer]);

    if (!isOpen || !customer) return null;

    const handleSendEmail = async (e) => {
        e.preventDefault();

        if (!subject.trim() || !message.trim()) {
            return toast.error("Subject and message are required.");
        }

        setIsSending(true);

        try {
            await API.post('/admin/customers/send-email', {
                customerId: customer._id,
                email: customer.email,
                subject: subject,
                message: message,
                shopName: shopName || "Store Administration" // Send shopName to backend
            });

            toast.success(`Email sent successfully to ${customer.fullName}`);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to send email.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Send Email to Customer</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isSending}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSendEmail} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
                        <input
                            type="text"
                            value={`${customer.fullName} (${customer.email})`}
                            disabled
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
                        <input
                            type="text"
                            placeholder="Enter email subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isSending}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message:</label>
                        <textarea
                            rows="5"
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isSending}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        ></textarea>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} disabled={isSending} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSending} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center disabled:opacity-70 disabled:cursor-not-allowed">
                            {isSending ? "Sending..." : "Send Email"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SendMailModal;
