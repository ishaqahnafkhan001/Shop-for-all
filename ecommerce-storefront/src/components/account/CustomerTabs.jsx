"use client";
import { AccountSecurityView } from '@scaleup/storefront-renderer/presentation/AccountSecurityView';
export { OrderHistoryTab, ProfileTab } from '@scaleup/storefront-renderer/presentation/AccountTabsViews';
import React, { useState } from 'react';
import API from '@/api/api'; // Added API import for password reset
import { toast } from 'react-hot-toast'; // Added toast for notifications





// 🌟 UPDATED: SecurityTab now handles its own state and API requests
export function SecurityTab({ presentationVariant, adaptiveParts = false } = {}) {
    const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);

    const passwordChecks = {
        length: passForm.newPassword.length >= 8,
        lower: /[a-z]/.test(passForm.newPassword),
        upper: /[A-Z]/.test(passForm.newPassword),
        number: /\d/.test(passForm.newPassword),
        special: /[^A-Za-z0-9]/.test(passForm.newPassword)
    };
    const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
    const passwordsMatch = passForm.newPassword && passForm.confirmPassword && passForm.newPassword === passForm.confirmPassword;

    const handlePasswordReset = async (e) => {
        e.preventDefault();

        if (passwordScore < 5) {
            return toast.error("Use at least 8 characters with uppercase, lowercase, number, and special character.");
        }

        if (!passwordsMatch) {
            return toast.error("Passwords do not match.");
        }

        setLoading(true);
        try {
            const { data } = await API.put('/auth/update-password', {
                currentPassword: passForm.currentPassword,
                newPassword: passForm.newPassword,
                confirmPassword: passForm.confirmPassword
            });

            toast.success(data.message || "Password updated successfully!");
            setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AccountSecurityView {...{ adaptiveParts, handlePasswordReset, loading, passForm, passwordScore, passwordsMatch, presentationVariant, setPassForm }} />
    );
}
