import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../api/api';

const SupportInvite = () => {
    const { token } = useParams();
    const [invite, setInvite] = useState(null);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await API.get(`/auth/support-invitations/${token}`);
                setInvite(data.data);
            } catch (err) {
                toast.error(err.response?.data?.error || 'Invitation is invalid or expired.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await API.post(`/auth/support-invitations/${token}/accept`, { password });
            setAccepted(true);
            toast.success('Support account activated.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not activate support account.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-indigo-600">ScaleUp Support</p>
                <h1 className="mt-2 text-2xl font-black text-slate-950">Activate support account</h1>
                {loading ? (
                    <p className="mt-6 text-sm text-slate-500">Checking invitation...</p>
                ) : accepted ? (
                    <div className="mt-6 space-y-4">
                        <p className="text-sm leading-6 text-slate-600">Your account is active. Sign in with your email and new password.</p>
                        <Link to="/login" className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Go to login</Link>
                    </div>
                ) : invite ? (
                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                            <p><span className="font-bold text-slate-900">Name:</span> {invite.fullName}</p>
                            <p><span className="font-bold text-slate-900">Email:</span> {invite.email}</p>
                            <p><span className="font-bold text-slate-900">Role:</span> {invite.supportRole}</p>
                        </div>
                        <label className="block text-sm font-bold text-slate-700">
                            Password
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-indigo-400"
                                minLength={8}
                                required
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={saving || password.length < 8}
                            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {saving ? 'Activating...' : 'Activate account'}
                        </button>
                    </form>
                ) : (
                    <p className="mt-6 text-sm text-rose-600">This invitation cannot be used.</p>
                )}
            </div>
        </div>
    );
};

export default SupportInvite;
