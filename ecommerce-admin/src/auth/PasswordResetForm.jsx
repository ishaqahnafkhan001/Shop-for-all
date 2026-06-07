import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../api/api';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

const emptyOtp = () => Array(6).fill('');

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const getPasswordChecks = (password) => ({
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
});

const getStrengthLabel = (score) => {
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Good';
    return 'Strong';
};

const PasswordResetForm = ({ onBack }) => {
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(emptyOtp);
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [error, setError] = useState('');
    const otpRefs = useRef([]);

    const checks = useMemo(() => getPasswordChecks(password), [password]);
    const score = Object.values(checks).filter(Boolean).length;
    const otpValue = otp.join('');
    const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
    const canReset = score === 5 && passwordsMatch && Boolean(resetToken);

    useEffect(() => {
        if (resendTimer <= 0) return undefined;

        const interval = setInterval(() => {
            setResendTimer((value) => Math.max(0, value - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [resendTimer]);

    const requestOtp = async (event) => {
        event?.preventDefault();
        if (!email.trim()) {
            setError('Enter your email address first.');
            return;
        }
        if (resendTimer > 0) return;

        setIsLoading(true);
        setError('');
        try {
            const { data } = await API.post('/auth/forgot-password', {
                email,
                audience: 'admin'
            });

            toast.success(data.message || 'If an account exists, an OTP has been sent.');
            setStep('otp');
            setResendTimer(60);
            setTimeout(() => otpRefs.current[0]?.focus(), 50);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not send reset code.');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async (event) => {
        event.preventDefault();
        if (otpValue.length !== 6) {
            setError('Enter the 6-digit verification code.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const { data } = await API.post('/auth/verify-reset-otp', {
                email,
                otp: otpValue,
                audience: 'admin'
            });

            setResetToken(data.resetToken);
            setStep('password');
            toast.success('Code verified.');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired verification code.');
            setOtp(emptyOtp());
            setTimeout(() => otpRefs.current[0]?.focus(), 50);
        } finally {
            setIsLoading(false);
        }
    };

    const submitNewPassword = async (event) => {
        event.preventDefault();
        if (!canReset) {
            setError('Use a strong password and make sure both passwords match.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await API.post('/auth/reset-password', {
                email,
                resetToken,
                password,
                confirmPassword,
                audience: 'admin'
            });

            toast.success('Password changed. Sign in with your new password.');
            onBack();
        } catch (err) {
            setError(err.response?.data?.error || 'Password reset failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        setOtp((current) => {
            const next = [...current];
            next[index] = digit;
            return next;
        });

        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, event) => {
        if (event.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (event) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;

        const next = emptyOtp();
        pasted.split('').forEach((digit, index) => {
            next[index] = digit;
        });
        setOtp(next);
        otpRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {step === 'email' && (
                <form onSubmit={requestOtp} className="space-y-5">
                    <Input
                        id="reset-email"
                        label="Email Address"
                        type="email"
                        placeholder="vendor@scaleup.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        helperText="We will send a reset code if this admin account exists."
                        required
                    />

                    <Button type="submit" isLoading={isLoading} className="w-full">
                        Send reset code
                    </Button>
                </form>
            )}

            {step === 'otp' && (
                <form onSubmit={verifyOtp} className="space-y-5">
                    <div>
                        <label className="admin-label mb-2">Verification Code</label>
                        <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(element) => {
                                        otpRefs.current[index] = element;
                                    }}
                                    value={digit}
                                    onChange={(event) => handleOtpChange(index, event.target.value)}
                                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                    maxLength={1}
                                    className="h-11 rounded-lg border border-slate-300 text-center text-base font-bold focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                    aria-label={`Verification digit ${index + 1}`}
                                />
                            ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>Code expires in 10 minutes.</span>
                            <button
                                type="button"
                                onClick={requestOtp}
                                disabled={isLoading || resendTimer > 0}
                                className="font-bold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                                {resendTimer > 0 ? `Resend in ${formatTime(resendTimer)}` : 'Resend code'}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" isLoading={isLoading} disabled={otpValue.length !== 6} className="w-full">
                        Verify code
                    </Button>
                </form>
            )}

            {step === 'password' && (
                <form onSubmit={submitNewPassword} className="space-y-5">
                    <Input
                        id="new-password"
                        label="New Password"
                        type="password"
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />

                    <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-500">Password strength</span>
                            <span className={score === 5 ? 'text-emerald-600' : 'text-amber-600'}>
                                {getStrengthLabel(score)}
                            </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <span key={index} className={`h-1.5 rounded-full ${index < score ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                        <ul className="mt-3 grid gap-1 text-xs text-slate-500">
                            <li className={checks.length ? 'text-emerald-600' : ''}>At least 8 characters</li>
                            <li className={checks.upper && checks.lower ? 'text-emerald-600' : ''}>Uppercase and lowercase letters</li>
                            <li className={checks.number ? 'text-emerald-600' : ''}>At least one number</li>
                            <li className={checks.special ? 'text-emerald-600' : ''}>At least one special character</li>
                        </ul>
                    </div>

                    <Input
                        id="confirm-password"
                        label="Confirm Password"
                        type="password"
                        placeholder="Repeat your new password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        error={confirmPassword && !passwordsMatch ? 'Passwords do not match.' : ''}
                        required
                    />

                    <Button type="submit" isLoading={isLoading} disabled={!canReset} className="w-full">
                        Change password
                    </Button>
                </form>
            )}

            <button
                type="button"
                onClick={onBack}
                className="w-full text-center text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
                Back to sign in
            </button>
        </div>
    );
};

export default PasswordResetForm;
