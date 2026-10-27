"use client";
import { TrackingView, cancellationReasons, returnReasons, getProductId, getVariantId, getItemKey } from '@scaleup/storefront-renderer/presentation/TrackingView';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';
import React, { useMemo, useState } from 'react';

import API from '@/api/api';
import {getStorefrontPresentationVariant} from '@scaleup/storefront-theme';

import {useStorefrontTheme} from '@/components/storefront/StorefrontThemeProvider';
import { toast } from 'react-hot-toast';

















export default function TrackOrderPage({ params }) {
    const { subdomain } = React.use(params);
    const {theme} = useStorefrontTheme();
    const presentationVariant = getStorefrontPresentationVariant(theme);
    const atelier = presentationVariant === 'atelier-editorial';
    const [trackingId, setTrackingId] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [orderAccessToken, setOrderAccessToken] = useState('');
    const [accessOtpSent, setAccessOtpSent] = useState(false);
    const [accessOtpMaskedPhone, setAccessOtpMaskedPhone] = useState('');
    const [accessOtp, setAccessOtp] = useState('');
    const [cancelOpen, setCancelOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState(cancellationReasons[0]);
    const [cancelNote, setCancelNote] = useState('');
    const [returnReason, setReturnReason] = useState(returnReasons[0]);
    const [returnDescription, setReturnDescription] = useState('');
    const [selectedReturnItems, setSelectedReturnItems] = useState([]);
    const [returnProofImages, setReturnProofImages] = useState([]);
    const [returnProofVideo, setReturnProofVideo] = useState(null);

    const steps = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
    const currentStepIndex = order ? steps.indexOf(order.status) : -1;
    const progressWidth = currentStepIndex === -1 ? '0%' : `${(currentStepIndex / (steps.length - 1)) * 100}%`;
    const address = order?.shippingAddress;

    const orderItems = useMemo(() => order?.items || [], [order]);
    const canRequestReturn = Boolean(order?.returnEligibility?.canRequestReturn);
    const returnStatusTone = order?.returnRequest?.status === 'Rejected'
        ? 'red'
        : order?.returnRequest?.status === 'Refunded'
            ? 'green'
            : 'amber';

    const resetOrderAccess = () => {
        setOrderAccessToken('');
        setAccessOtpSent(false);
        setAccessOtpMaskedPhone('');
        setAccessOtp('');
        setOrder(null);
    };

    const fetchTrackedOrder = async ({ showSuccess = false, accessToken = orderAccessToken } = {}) => {
        const cleanTrackingId = trackingId.trim();
        if (!cleanTrackingId) {
            toast.error('Please enter an Order ID');
            return null;
        }
        if (!accessToken) {
            toast.error('Verify your delivery phone first.');
            return null;
        }

        setLoading(true);
        try {
            const { data } = await API.get(`/storefront/${subdomain}/track-order/${cleanTrackingId}`, {
                headers: { 'x-order-access-token': accessToken }
            });
            setOrder(data);
            if (showSuccess) toast.success('Order found!');
            return data;
        } catch (error) {
            setOrder(null);
            toast.error(error.response?.data?.error || 'Order not found.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleTrackOrder = async (event) => {
        event.preventDefault();
        const cleanTrackingId = trackingId.trim();
        const cleanPhone = phone.trim();
        if (!cleanTrackingId) return toast.error('Please enter an Order ID');
        if (!cleanPhone) return toast.error('Please enter the delivery phone number');

        if (orderAccessToken) {
            await fetchTrackedOrder({ showSuccess: true });
            return;
        }

        setLoading(true);
        try {
            if (!accessOtpSent) {
                const { data } = await API.post(`/storefront/${subdomain}/orders/${cleanTrackingId}/access/send-otp`, {
                    phone: cleanPhone
                });
                setAccessOtpSent(true);
                setAccessOtpMaskedPhone(data.maskedPhone || '');
                toast.success(data.message || 'Verification code sent.');
                return;
            }

            if (accessOtp.trim().length !== 6) {
                toast.error('Enter the 6-digit verification code.');
                return;
            }

            const { data } = await API.post(`/storefront/${subdomain}/orders/${cleanTrackingId}/access/verify-otp`, {
                phone: cleanPhone,
                otp: accessOtp.trim()
            });
            setOrderAccessToken(data.accessToken || '');
            await fetchTrackedOrder({ showSuccess: true, accessToken: data.accessToken });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Could not verify this order.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (event) => {
        event.preventDefault();
        if (!order?.canCancel) return;

        setActionLoading(true);
        try {
            const { data } = await API.post(`/storefront/${subdomain}/orders/${order._id}/cancel`, {
                reason: cancelReason,
                note: cancelNote,
                accessToken: orderAccessToken
            }, {
                headers: { 'x-order-access-token': orderAccessToken }
            });
            toast.success(data.message || 'Order cancelled successfully.');
            setCancelOpen(false);
            setCancelNote('');
            await fetchTrackedOrder();
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Could not cancel this order.');
        } finally {
            setActionLoading(false);
        }
    };

    const openReturnModal = () => {
        setSelectedReturnItems(orderItems.map(getItemKey));
        setReturnProofImages([]);
        setReturnProofVideo(null);
        setReturnOpen(true);
    };

    const toggleReturnItem = (item) => {
        const key = getItemKey(item);
        setSelectedReturnItems(prev => (
            prev.includes(key) ? prev.filter(itemKey => itemKey !== key) : [...prev, key]
        ));
    };

    const handleSubmitReturn = async (event) => {
        event.preventDefault();
        if (!canRequestReturn) return;
        if (selectedReturnItems.length === 0) {
            toast.error('Select at least one item to return.');
            return;
        }
        if (returnProofImages.length < 1) {
            toast.error('Upload at least one proof image.');
            return;
        }
        if (returnProofImages.length > 3) {
            toast.error('You can upload up to 3 proof images.');
            return;
        }

        const items = orderItems
            .filter(item => selectedReturnItems.includes(getItemKey(item)))
            .map(item => ({
                productId: getProductId(item),
                variantId: getVariantId(item),
                quantity: item.quantity
            }));

        const payload = new FormData();
        payload.append('accessToken', orderAccessToken);
        payload.append('reason', returnReason);
        payload.append('description', returnDescription);
        payload.append('items', JSON.stringify(items));
        returnProofImages.forEach(file => payload.append('proofImages', file));
        if (returnProofVideo) payload.append('proofVideo', returnProofVideo);

        setActionLoading(true);
        try {
            const { data } = await API.post(`/storefront/${subdomain}/orders/${order._id}/returns`, payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-order-access-token': orderAccessToken
                }
            });
            toast.success(data.message || 'Return request submitted.');
            setReturnOpen(false);
            setReturnDescription('');
            setReturnProofImages([]);
            setReturnProofVideo(null);
            await fetchTrackedOrder();
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Could not submit return request.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReturnProofImages = (event) => {
        const files = Array.from(event.target.files || []);
        const next = [...returnProofImages, ...files].slice(0, 3);
        if (returnProofImages.length + files.length > 3) {
            toast.error('Only the first 3 proof images were added.');
        }
        setReturnProofImages(next);
        event.target.value = '';
    };

    return (
        <StorefrontPresentationRuntime><TrackingView {...{ accessOtp, accessOtpMaskedPhone, accessOtpSent, actionLoading, address, atelier, canRequestReturn, cancelNote, cancelOpen, cancelReason, currentStepIndex, handleCancelOrder, handleReturnProofImages, handleSubmitReturn, handleTrackOrder, loading, openReturnModal, order, orderAccessToken, orderItems, phone, presentationVariant, progressWidth, resetOrderAccess, returnDescription, returnOpen, returnProofImages, returnProofVideo, returnReason, returnStatusTone, selectedReturnItems, setAccessOtp, setCancelNote, setCancelOpen, setCancelReason, setPhone, setReturnDescription, setReturnOpen, setReturnProofImages, setReturnProofVideo, setReturnReason, setTrackingId, steps, toggleReturnItem, trackingId }} /></StorefrontPresentationRuntime>
    );
}
