"use client";
import { Lock } from 'lucide-react';
export function AccountSecurityView({ adaptiveParts = false, handlePasswordReset, loading, passForm, passwordScore, passwordsMatch, presentationVariant, setPassForm }) { return (<div className="max-w-md">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-950">
                <Lock size={20} className="text-slate-400" />
                Change Password
            </h2>
            <form data-ab-surface={adaptiveParts ? '' : undefined} onSubmit={handlePasswordReset} className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                    <label data-ab-part={adaptiveParts ? 'label' : undefined} htmlFor={(presentationVariant === 'atelier-editorial' || adaptiveParts) ? 'security-current' : undefined} className="mb-1.5 block text-sm font-bold text-slate-700">Current Password</label>
                    <input data-ab-part={adaptiveParts ? 'input' : undefined}
                        required
                        type="password"
                        id={(presentationVariant === 'atelier-editorial' || adaptiveParts) ? 'security-current' : undefined}
                        value={passForm.currentPassword}
                        onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                        className="sf-field"
                        placeholder="Enter current password"
                    />
                </div>
                <div>
                    <label data-ab-part={adaptiveParts ? 'label' : undefined} htmlFor={(presentationVariant === 'atelier-editorial' || adaptiveParts) ? 'security-new' : undefined} className="mb-1.5 block text-sm font-bold text-slate-700">New Password</label>
                    <input data-ab-part={adaptiveParts ? 'input' : undefined}
                        required
                        type="password"
                        id={(presentationVariant === 'atelier-editorial' || adaptiveParts) ? 'security-new' : undefined}
                        value={passForm.newPassword}
                        onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                        className="sf-field"
                        placeholder="Enter new password"
                    />
                    <div className="mt-3">
                        <div className="mb-2 grid grid-cols-5 gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <span data-ab-surface={adaptiveParts ? '' : undefined} key={index} className={`h-1.5 rounded-full ${index < passwordScore ? 'bg-[var(--sf-accent)]' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                            Use 8+ characters with uppercase, lowercase, number, and special character.
                        </p>
                    </div>
                </div>
                <div>
                    <label data-ab-part={adaptiveParts ? 'label' : undefined} htmlFor={(presentationVariant === 'atelier-editorial' || adaptiveParts) ? 'security-confirm' : undefined} className="mb-1.5 block text-sm font-bold text-slate-700">Confirm New Password</label>
                    <input data-ab-part={adaptiveParts ? 'input' : undefined}
                        required
                        type="password"
                        id={(presentationVariant === 'atelier-editorial' || adaptiveParts) ? 'security-confirm' : undefined}
                        value={passForm.confirmPassword}
                        onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                        className="sf-field"
                        placeholder="Repeat new password"
                    />
                    {passForm.confirmPassword && !passwordsMatch && (
                        <p className="mt-2 text-xs font-bold text-red-600">Passwords do not match.</p>
                    )}
                </div>
                <button data-ab-part={adaptiveParts ? 'primaryButton' : undefined}
                    type="submit"
                    disabled={loading || passwordScore < 5 || !passwordsMatch}
                    className="sf-btn sf-btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>); }
