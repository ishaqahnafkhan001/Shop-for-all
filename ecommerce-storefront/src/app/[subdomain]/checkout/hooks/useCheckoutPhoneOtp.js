"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

import API from "@/api/api";

const createCheckoutSessionId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function useCheckoutPhoneOtp({ subdomain, resetKey }) {
    const [checkoutSessionId] = useState(createCheckoutSessionId);
    const [otp, setOtp] = useState("");
    const [otpKey, setOtpKey] = useState("");
    const [maskedPhone, setMaskedPhone] = useState("");
    const [maskedPhoneKey, setMaskedPhoneKey] = useState("");
    const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
    const [verifiedKey, setVerifiedKey] = useState("");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const visibleOtp = otpKey === resetKey ? otp : "";
    const visibleMaskedPhone = maskedPhoneKey === resetKey ? maskedPhone : "";
    const verified = Boolean(phoneVerificationToken) && verifiedKey === resetKey;
    const updateOtp = (value) => {
        setOtpKey(resetKey);
        setOtp(value);
    };

    const sendOtp = async ({ phone, items }) => {
        setSending(true);
        setPhoneVerificationToken("");
        setVerifiedKey("");
        try {
            const { data } = await API.post(`/storefront/${subdomain}/checkout/send-otp`, {
                phone,
                items,
                checkoutSessionId,
            });
            setMaskedPhone(data.maskedPhone || "");
            setMaskedPhoneKey(resetKey);
            toast.success(data.message || "Verification code sent");
        } catch (error) {
            toast.error(error.response?.data?.error || "Could not send phone verification code");
        } finally {
            setSending(false);
        }
    };

    const verifyOtp = async ({ phone, items }) => {
        if (visibleOtp.trim().length !== 6) {
            toast.error("Enter the 6-digit verification code");
            return;
        }

        setVerifying(true);
        try {
            const { data } = await API.post(`/storefront/${subdomain}/checkout/verify-otp`, {
                phone,
                items,
                otp: visibleOtp.trim(),
                checkoutSessionId,
            });
            setPhoneVerificationToken(data.phoneVerificationToken || "");
            setVerifiedKey(resetKey);
            setMaskedPhone(data.maskedPhone || "");
            setMaskedPhoneKey(resetKey);
            toast.success(data.message || "Phone verified");
        } catch (error) {
            setPhoneVerificationToken("");
            setVerifiedKey("");
            toast.error(error.response?.data?.error || "Invalid or expired verification code");
        } finally {
            setVerifying(false);
        }
    };

    return {
        checkoutSessionId,
        otp: visibleOtp,
        setOtp: updateOtp,
        maskedPhone: visibleMaskedPhone,
        phoneVerificationToken,
        verified,
        sending,
        verifying,
        sendOtp,
        verifyOtp,
    };
}
