import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    CheckCircle2,
    LifeBuoy,
    Paperclip,
    Plus,
    RefreshCw,
    Send,
    UserPlus
} from 'lucide-react';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader.jsx';
import PaginationBar from '../../components/ui/PaginationBar.jsx';

const categories = [
    ['products', 'Products'],
    ['orders', 'Orders'],
    ['inventory', 'Inventory'],
    ['returns', 'Returns'],
    ['promotions', 'Promotions'],
    ['scheduled_sales', 'Scheduled sales'],
    ['store_builder', 'Store Builder'],
    ['storefront', 'Storefront'],
    ['custom_domain', 'Custom domain'],
    ['email', 'Email'],
    ['sms', 'SMS'],
    ['courier_pathao', 'Pathao'],
    ['courier_redx', 'RedX'],
    ['staff_permissions', 'Staff permissions'],
    ['billing', 'Billing'],
    ['account', 'Account'],
    ['security', 'Security'],
    ['performance', 'Performance'],
    ['other', 'Other']
];

const platformRoles = new Set(['SuperAdmin', 'SupportAgent', 'SupportLead', 'TechnicalSupport']);
const supportManagementRoles = new Set(['SuperAdmin', 'SupportLead']);

const defaultTicketForm = {
    subject: '',
    category: 'other',
    priority: 'normal',
    description: '',
    affectedRoute: '',
    affectedEntityType: '',
    affectedEntityId: ''
};

const StatusBadge = ({ value }) => (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
        {String(value || '').replaceAll('_', ' ')}
    </span>
);

const PriorityBadge = ({ value }) => {
    const colors = {
        critical: 'bg-rose-100 text-rose-700',
        high: 'bg-amber-100 text-amber-700',
        normal: 'bg-blue-100 text-blue-700',
        low: 'bg-slate-100 text-slate-600'
    };
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${colors[value] || colors.normal}`}>{value || 'normal'}</span>;
};

const SupportCenter = () => {
    const { user } = useAuth();
    const isPlatform = platformRoles.has(user?.role);
    const canManageSupport = supportManagementRoles.has(user?.role);
    const basePath = isPlatform ? '/support' : '/admin/support';
    const [tickets, setTickets] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 25, totalItems: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ page: 1, status: 'all', category: 'all', priority: 'all', search: '' });
    const [selectedTicketNumber, setSelectedTicketNumber] = useState('');
    const [ticketDetail, setTicketDetail] = useState(null);
    const [overview, setOverview] = useState(null);
    const [knownIssues, setKnownIssues] = useState([]);
    const [staff, setStaff] = useState([]);
    const [ticketForm, setTicketForm] = useState(defaultTicketForm);
    const [ticketFiles, setTicketFiles] = useState([]);
    const [reply, setReply] = useState('');
    const [internalNote, setInternalNote] = useState('');
    const [resolutionSummary, setResolutionSummary] = useState('');
    const [inviteForm, setInviteForm] = useState({
        fullName: '',
        email: '',
        supportRole: 'SupportAgent',
        skills: 'general_support',
        maximumActiveTickets: 5
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const pageDescription = isPlatform
        ? 'Manage platform support tickets, assignments, capacity, and known issues.'
        : 'Report problems, follow replies, and confirm resolutions for your store.';

    const loadOverview = useCallback(async () => {
        const endpoint = isPlatform ? '/support/dashboard' : '/admin/support/overview';
        const { data } = await API.get(endpoint);
        setOverview(data.data || null);
        if (!isPlatform) setKnownIssues(data.data?.knownIssues || []);
    }, [isPlatform]);

    const loadTickets = useCallback(async () => {
        const { data } = await API.get(`${basePath}/tickets`, {
            params: { ...filters, limit: 25 }
        });
        setTickets(data.data || []);
        setPagination(data.pagination || { page: filters.page, limit: 25, totalPages: 1 });
    }, [basePath, filters]);

    const loadStaff = useCallback(async () => {
        if (!isPlatform || user?.role === 'SupportAgent') return;
        const { data } = await API.get('/support/staff');
        setStaff(data.data || []);
    }, [isPlatform, user?.role]);

    const loadKnownIssues = useCallback(async () => {
        const endpoint = isPlatform ? '/support/known-issues' : '/admin/support/known-issues';
        const { data } = await API.get(endpoint);
        setKnownIssues(data.data || []);
    }, [isPlatform]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([loadOverview(), loadTickets(), loadStaff(), loadKnownIssues()]);
        } catch {
            toast.error('Failed to load support center');
        } finally {
            setLoading(false);
        }
    }, [loadOverview, loadTickets, loadStaff, loadKnownIssues]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const selectedTicket = useMemo(() => (
        ticketDetail?.ticket || tickets.find(ticket => ticket.ticketNumber === selectedTicketNumber)
    ), [ticketDetail, tickets, selectedTicketNumber]);

    const openTicket = async (ticketNumber) => {
        setSelectedTicketNumber(ticketNumber);
        try {
            const { data } = await API.get(`${basePath}/tickets/${ticketNumber}`);
            setTicketDetail(data.data || null);
        } catch {
            toast.error('Failed to load ticket');
        }
    };

    const createTicket = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const form = new FormData();
            Object.entries(ticketForm).forEach(([key, value]) => form.append(key, value));
            form.append('diagnostics', JSON.stringify({
                route: window.location.pathname,
                browser: navigator.userAgent,
                screen: `${window.innerWidth}x${window.innerHeight}`,
                timestamp: new Date().toISOString()
            }));
            ticketFiles.forEach(file => form.append('attachments', file));
            const { data } = await API.post('/admin/support/tickets', form);
            toast.success('Support ticket created');
            setTicketForm(defaultTicketForm);
            setTicketFiles([]);
            await loadTickets();
            await openTicket(data.data.ticketNumber);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create ticket');
        } finally {
            setSaving(false);
        }
    };

    const sendReply = async ({ internal = false } = {}) => {
        if (!selectedTicket) return;
        const body = internal ? internalNote : reply;
        if (!body.trim()) return;
        setSaving(true);
        try {
            const endpoint = isPlatform
                ? `/support/tickets/${selectedTicket.ticketNumber}/${internal ? 'internal-notes' : 'messages'}`
                : `/admin/support/tickets/${selectedTicket.ticketNumber}/messages`;
            await API.post(endpoint, internal ? { body, internal: true } : { body });
            toast.success(internal ? 'Internal note added' : 'Reply sent');
            setReply('');
            setInternalNote('');
            await openTicket(selectedTicket.ticketNumber);
            await loadTickets();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send message');
        } finally {
            setSaving(false);
        }
    };

    const updateTicketStatus = async (status) => {
        if (!selectedTicket) return;
        setSaving(true);
        try {
            await API.patch(`/support/tickets/${selectedTicket.ticketNumber}/status`, {
                status,
                resolutionSummary
            });
            toast.success('Ticket updated');
            setResolutionSummary('');
            await openTicket(selectedTicket.ticketNumber);
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update ticket');
        } finally {
            setSaving(false);
        }
    };

    const assignTicket = async (staffUserId) => {
        if (!selectedTicket || !staffUserId) return;
        setSaving(true);
        try {
            await API.post(`/support/tickets/${selectedTicket.ticketNumber}/assign`, {
                staffUserId,
                reason: 'Assigned from support center'
            });
            toast.success('Ticket assigned');
            await openTicket(selectedTicket.ticketNumber);
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to assign ticket');
        } finally {
            setSaving(false);
        }
    };

    const confirmResolution = async (resolved) => {
        if (!selectedTicket) return;
        setSaving(true);
        try {
            const endpoint = resolved
                ? `/admin/support/tickets/${selectedTicket.ticketNumber}/confirm-resolution`
                : `/admin/support/tickets/${selectedTicket.ticketNumber}/reopen`;
            await API.post(endpoint, resolved ? {} : { reason: 'Issue is not resolved yet.' });
            toast.success(resolved ? 'Ticket closed' : 'Ticket reopened');
            await openTicket(selectedTicket.ticketNumber);
            await loadTickets();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Ticket action failed');
        } finally {
            setSaving(false);
        }
    };

    const inviteStaff = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await API.post('/support/staff/invitations', {
                ...inviteForm,
                maximumActiveTickets: Number(inviteForm.maximumActiveTickets || 5),
                skills: inviteForm.skills.split(',').map(item => item.trim()).filter(Boolean)
            });
            toast.success('Support invitation queued');
            setInviteForm({ fullName: '', email: '', supportRole: 'SupportAgent', skills: 'general_support', maximumActiveTickets: 5 });
            await loadStaff();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to invite support staff');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title={isPlatform ? 'Support Center' : 'Help & Support'}
                description={pageDescription}
                action={(
                    <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                        <RefreshCw size={16} /> Refresh
                    </button>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(overview?.counts || {}).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{key.replaceAll(/([A-Z_])/g, ' $1')}</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                    </div>
                ))}
            </div>

            {!isPlatform && (
                <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
                    <form onSubmit={createTicket} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-black text-slate-950">Report an issue</h2>
                        </div>
                        <div className="mt-4 space-y-3">
                            <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Subject" value={ticketForm.subject} onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))} />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={ticketForm.category} onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}>
                                    {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                                <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={ticketForm.priority} onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}>
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical impact</option>
                                </select>
                            </div>
                            <textarea className="min-h-36 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="What were you trying to do? What happened? What did you expect?" value={ticketForm.description} onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))} />
                            <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Affected page or route" value={ticketForm.affectedRoute} onChange={(e) => setTicketForm(prev => ({ ...prev, affectedRoute: e.target.value }))} />
                            <label className="block rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                                <span className="inline-flex items-center gap-2 font-bold text-slate-700"><Paperclip size={16} /> Attach screenshots or short video</span>
                                <input type="file" multiple className="mt-3 block w-full text-sm" onChange={(e) => setTicketFiles(Array.from(e.target.files || []))} />
                            </label>
                            <button disabled={saving} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                                {saving ? 'Creating...' : 'Create ticket'}
                            </button>
                        </div>
                    </form>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Known issues</h2>
                        <div className="mt-4 space-y-3">
                            {knownIssues.length === 0 ? (
                                <p className="text-sm text-slate-500">No active platform issues right now.</p>
                            ) : knownIssues.map(issue => (
                                <div key={issue._id} className="rounded-xl bg-slate-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-bold text-slate-900">{issue.title}</p>
                                        <PriorityBadge value={issue.severity} />
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{issue.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-black text-slate-950">Tickets</h2>
                            <div className="flex flex-wrap gap-2">
                                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search" value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))} />
                                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}>
                                    <option value="all">All statuses</option>
                                    {['open', 'unassigned', 'assigned', 'in_progress', 'waiting_for_vendor', 'waiting_for_engineering', 'resolved_pending_confirmation', 'closed', 'reopened'].map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <p className="p-5 text-sm text-slate-500">Loading tickets...</p>
                        ) : tickets.length === 0 ? (
                            <p className="p-5 text-sm text-slate-500">No tickets found.</p>
                        ) : tickets.map(ticket => (
                            <button
                                key={ticket.ticketNumber}
                                onClick={() => openTicket(ticket.ticketNumber)}
                                className={`block w-full p-4 text-left transition hover:bg-slate-50 ${selectedTicketNumber === ticket.ticketNumber ? 'bg-indigo-50/60' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-indigo-600">{ticket.ticketNumber}</p>
                                        <p className="mt-1 font-bold text-slate-950">{ticket.subject}</p>
                                        <p className="mt-1 text-sm text-slate-500">{ticket.category?.replaceAll('_', ' ')} {ticket.shop?.shopName ? `- ${ticket.shop.shopName}` : ''}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <PriorityBadge value={ticket.priority} />
                                        <StatusBadge value={ticket.status} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <PaginationBar
                        pagination={pagination}
                        label="tickets"
                        onPrevious={() => setFilters(prev => ({ ...prev, page: Math.max(1, Number(prev.page || 1) - 1) }))}
                        onNext={() => setFilters(prev => ({ ...prev, page: Number(prev.page || 1) + 1 }))}
                    />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {!selectedTicket ? (
                        <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
                            <LifeBuoy className="h-10 w-10 text-slate-300" />
                            <p className="mt-3 font-bold text-slate-800">Select a ticket</p>
                            <p className="mt-1 text-sm text-slate-500">Conversation, status, assignment, and resolution details appear here.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="border-b border-slate-100 p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-indigo-600">{selectedTicket.ticketNumber}</p>
                                        <h2 className="mt-1 text-xl font-black text-slate-950">{selectedTicket.subject}</h2>
                                        <p className="mt-2 text-sm text-slate-500">{selectedTicket.description}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <PriorityBadge value={selectedTicket.priority} />
                                        <StatusBadge value={selectedTicket.status} />
                                    </div>
                                </div>

                                {isPlatform && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {canManageSupport && (
                                            <select onChange={(e) => assignTicket(e.target.value)} defaultValue="" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                                <option value="">Assign staff</option>
                                                {staff.map(item => (
                                                    <option key={item.userId} value={item.userId}>{item.fullName} - {item.activeTicketCount}/{item.maximumActiveTickets}</option>
                                                ))}
                                            </select>
                                        )}
                                        <button onClick={() => updateTicketStatus('in_progress')} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">In progress</button>
                                        <button onClick={() => updateTicketStatus('waiting_for_vendor')} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Need info</button>
                                    </div>
                                )}
                            </div>

                            <div className="max-h-[34rem] space-y-3 overflow-y-auto p-5">
                                {(ticketDetail?.messages || []).map(message => (
                                    <div key={message._id} className={`rounded-2xl p-4 ${message.isInternalNote ? 'bg-amber-50 ring-1 ring-amber-100' : message.senderRole?.startsWith('Vendor') ? 'bg-slate-50' : 'bg-indigo-50'}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                                {message.isInternalNote ? 'Internal note' : message.senderName || message.senderRole}
                                            </p>
                                            <p className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleString()}</p>
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
                                        {message.attachments?.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {message.attachments.map((file, index) => (
                                                    <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700">
                                                        Attachment {index + 1}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 border-t border-slate-100 p-5">
                                {!isPlatform && selectedTicket.status === 'resolved_pending_confirmation' && (
                                    <div className="flex flex-wrap gap-2 rounded-xl bg-emerald-50 p-3">
                                        <button onClick={() => confirmResolution(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"><CheckCircle2 size={16} /> Issue resolved</button>
                                        <button onClick={() => confirmResolution(false)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700"><AlertTriangle size={16} /> Not resolved</button>
                                    </div>
                                )}

                                {isPlatform && (
                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Resolution summary" value={resolutionSummary} onChange={(e) => setResolutionSummary(e.target.value)} />
                                        <button onClick={() => updateTicketStatus('resolved_pending_confirmation')} disabled={saving || !resolutionSummary.trim()} className="mt-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Mark resolved</button>
                                    </div>
                                )}

                                <textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Write a reply" value={reply} onChange={(e) => setReply(e.target.value)} />
                                <button onClick={() => sendReply()} disabled={saving || !reply.trim()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                                    <Send size={16} /> Send reply
                                </button>

                                {isPlatform && (
                                    <div className="rounded-xl bg-amber-50 p-3">
                                        <textarea className="min-h-20 w-full rounded-xl border border-amber-200 px-3 py-2 text-sm" placeholder="Internal note, hidden from vendor" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
                                        <button onClick={() => sendReply({ internal: true })} disabled={saving || !internalNote.trim()} className="mt-2 rounded-xl bg-amber-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Add internal note</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {isPlatform && user?.role !== 'SupportAgent' && (
                <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Support staff</h2>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase tracking-wide text-slate-400">
                                    <tr><th className="py-2">Staff</th><th>Role</th><th>Status</th><th>Capacity</th><th>Skills</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {staff.map(item => (
                                        <tr key={item._id}>
                                            <td className="py-3 font-bold text-slate-900">{item.fullName}<p className="text-xs font-normal text-slate-500">{item.email}</p></td>
                                            <td>{item.supportRole}</td>
                                            <td>{item.calculatedStatus}</td>
                                            <td>{item.activeTicketCount}/{item.maximumActiveTickets}</td>
                                            <td className="max-w-xs truncate">{item.skills?.join(', ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {canManageSupport && (
                        <form onSubmit={inviteStaff} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-lg font-black text-slate-950">Invite support staff</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Full name" value={inviteForm.fullName} onChange={(e) => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))} />
                                <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Email" value={inviteForm.email} onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))} />
                                <select className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={inviteForm.supportRole} onChange={(e) => setInviteForm(prev => ({ ...prev, supportRole: e.target.value }))}>
                                    <option value="SupportAgent">Support Agent</option>
                                    <option value="SupportLead">Support Lead</option>
                                    <option value="TechnicalSupport">Technical Support</option>
                                </select>
                                <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Skills comma separated" value={inviteForm.skills} onChange={(e) => setInviteForm(prev => ({ ...prev, skills: e.target.value }))} />
                                <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" type="number" min="1" max="50" value={inviteForm.maximumActiveTickets} onChange={(e) => setInviteForm(prev => ({ ...prev, maximumActiveTickets: e.target.value }))} />
                                <button disabled={saving} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Invite staff</button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default SupportCenter;
