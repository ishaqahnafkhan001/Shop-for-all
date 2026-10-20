"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import API from "@/api/api";

const createCheckoutSessionId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};
const timestamp = value => {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
};
const normalizePhone = value => String(value || "").replace(/\D/g, "").replace(/^880/, "0");

export function useCheckoutPhoneOtp({ subdomain, resetKey, phone = "" }) {
    const bindingKey = `${subdomain}::${resetKey}`;
    const [checkoutSessionId] = useState(createCheckoutSessionId);
    const [code, setCode] = useState({ key: "", value: "" });
    const [delivery, setDelivery] = useState({ key: "", expiresAt: 0, maskedPhone: "" });
    const [proof, setProof] = useState({ key: "", token: "", expiresAt: 0 });
    const [cooldowns, setCooldowns] = useState({});
    const [feedback, setFeedback] = useState({ key: "", error: "", message: "" });
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [now, setNow] = useState(Date.now);
    const mounted = useRef(true);
    const operation = useRef(null);
    const latestKey = useRef(bindingKey);
    const cooldownRef = useRef({});
    useEffect(() => { latestKey.current = bindingKey; }, [bindingKey]);
    const phoneKey = `${subdomain}:${normalizePhone(phone)}`;
    const resendAt = cooldowns[phoneKey] || 0;
    const codeSent = delivery.key === bindingKey && delivery.expiresAt > 0;
    const expiresAt = codeSent ? delivery.expiresAt : 0;
    const verified = proof.key === bindingKey && Boolean(proof.token) && proof.expiresAt > now;
    const cooldownSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
    const expired = codeSent && expiresAt <= now;

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    const ticking = resendAt > now || expiresAt > now || (proof.key === bindingKey && proof.expiresAt > now);
    useEffect(() => {
        if (!ticking) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [ticking]);

    const updateOtp = value => setCode({key: bindingKey, value: String(value).replace(/\D/g, "").slice(0, 6)});
    const current = key => mounted.current && latestKey.current === key;
    const setCooldown = (key, until) => {
        // A cart/city change or dialog close cannot reset the phone/session cooldown.
        const next = Math.max(cooldownRef.current[key] || 0, until);
        cooldownRef.current[key] = next;
        setCooldowns(previous => ({...previous, [key]: next}));
    };
    const sendOtp = async ({ phone: requestedPhone, items }) => {
        if (operation.current) return null;
        const requestPhoneKey = `${subdomain}:${normalizePhone(requestedPhone)}`;
        if ((cooldownRef.current[requestPhoneKey] || 0) > Date.now()) return null;
        const key = bindingKey;
        operation.current = "send";
        setSending(true);
        setProof({ key: "", token: "", expiresAt: 0 });
        setFeedback({key, error: "", message: ""});
        try {
            const { data } = await API.post(`/storefront/${subdomain}/checkout/send-otp`, {
                phone: requestedPhone, items, checkoutSessionId,
            });
            if (!mounted.current) return null;
            setCooldown(requestPhoneKey, timestamp(data.resendAvailableAt));
            if (!current(key)) return null;
            setNow(Date.now());
            setDelivery({key, maskedPhone: data.maskedPhone || "", expiresAt: timestamp(data.expiresAt)});
            setCode({key, value: ""});
            const message = data.message || "Verification code sent";
            setFeedback({key, error: "", message});
            toast.success(message);
            return data;
        } catch (error) {
            if (!current(key)) return null;
            const retry = Number(error.response?.data?.retryAfterSeconds || error.response?.headers?.["retry-after"]);
            if (Number.isFinite(retry) && retry > 0) setCooldown(requestPhoneKey, Date.now() + retry * 1000);
            setNow(Date.now());
            const message = error.response?.data?.error || "Could not send phone verification code. Please try again.";
            setFeedback({key, error: message, message: ""});
            toast.error(message);
            return null;
        } finally {
            operation.current = null;
            if (mounted.current) setSending(false);
        }
    };
    const verifyOtp = async ({ phone: requestedPhone, items }) => {
        if (operation.current) return null;
        const otp = code.key === bindingKey ? code.value : "";
        if (!/^\d{6}$/.test(otp) || !codeSent || expiresAt <= Date.now()) {
            const error = expired ? "Verification code expired. Request a new code." : "Enter the 6-digit verification code";
            setFeedback({key: bindingKey, error, message: ""});
            toast.error(error);
            return null;
        }
        const key = bindingKey;
        operation.current = "verify";
        setVerifying(true);
        setFeedback({key, error: "", message: ""});
        try {
            const { data } = await API.post(`/storefront/${subdomain}/checkout/verify-otp`, {
                phone: requestedPhone, items, otp, checkoutSessionId,
            });
            if (!current(key)) return null;
            if (!data.phoneVerificationToken || timestamp(data.expiresAt) <= Date.now()) throw new Error("Missing verification proof");
            setProof({key, token: data.phoneVerificationToken, expiresAt: timestamp(data.expiresAt)});
            setNow(Date.now());
            const message = data.message || "Phone verified";
            setFeedback({key, error: "", message});
            toast.success(message);
            return data;
        } catch (error) {
            if (!current(key)) return null;
            setProof({key: "", token: "", expiresAt: 0});
            const message = error.response?.data?.error || "Invalid or expired verification code";
            setFeedback({key, error: message, message: ""});
            toast.error(message);
            return null;
        } finally {
            operation.current = null;
            if (mounted.current) setVerifying(false);
        }
    };
    return {
        checkoutSessionId,
        otp: code.key === bindingKey ? code.value : "",
        setOtp: updateOtp,
        maskedPhone: delivery.key === bindingKey ? delivery.maskedPhone : "",
        phoneVerificationToken: verified ? proof.token : "",
        verified, sending, verifying, sendOtp, verifyOtp, codeSent, expired, cooldownSeconds,
        error: feedback.key === bindingKey ? feedback.error : "",
        message: feedback.key === bindingKey ? feedback.message : "",
    };
}
