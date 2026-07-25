import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Activity,
    AlertTriangle,
    BadgeCheck,
    BarChart3,
    Boxes,
    Building2,
    ChevronDown,
    CreditCard,
    Crown,
    Flag,
    Globe,
    History,
    KeyRound,
    LifeBuoy,
    LockKeyhole,
    Megaphone,
    PanelsTopLeft,
    ReceiptText,
    RefreshCcw,
    Settings,
    ShieldCheck,
    Truck,
    Users,
    WalletCards,
    X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    filterVendorNavigation,
    findActiveNavigation,
    getVendorNavigationStorageKey
} from '../../config/dashboardNavigation.jsx';
import { FEATURE_LABELS, hasFeature } from '../../utils/featureAccess';
import {
    hasPlatformPermission,
    isPlatformRole
} from '../../utils/platformAccess';

const platformNavigation = {
    platform: [
        {
            label: 'Monitor',
            items: [
                { label: 'Platform Overview', path: '/super-admin', icon: Crown, permission: 'platform.overview.read' }
            ]
        },
        {
            label: 'Commerce',
            items: [
                { label: 'Shops', path: '/super-admin/shops', icon: Building2, permission: 'platform.shops.read' },
                { label: 'Subscriptions', path: '/super-admin/subscriptions', icon: CreditCard, permission: 'billing.read' },
                { label: 'Payments', path: '/super-admin/payments', icon: WalletCards, permission: 'billing.read' },
                { label: 'Invoices', path: '/super-admin/invoices', icon: ReceiptText, permission: 'billing.read' },
                { label: 'Vendor Plans', path: '/super-admin/plans', icon: PanelsTopLeft, permission: 'billing.read' }
            ]
        },
        {
            label: 'Trust & Compliance',
            items: [
                { label: 'Verification', path: '/super-admin/vendor-verifications', icon: BadgeCheck, permission: 'compliance.verification.read' },
                { label: 'Badges', path: '/super-admin/badges', icon: ShieldCheck, permission: 'trust.badges.read' },
                { label: 'Abuse & Risk', path: '/super-admin/risk', icon: AlertTriangle, permission: 'risk.cases.view' }
            ]
        },
        {
            label: 'Operations',
            items: [
                { label: 'Domains', path: '/super-admin/domains', icon: Globe, permission: 'platform.domains.view' },
                { label: 'Shipping', path: '/super-admin/shipping', icon: Truck, permission: 'platform.shipping.view' },
                { label: 'Background Jobs', path: '/super-admin/jobs', icon: Boxes, permission: 'workers.jobs.view' },
                { label: 'Reconciliation', path: '/super-admin/reconciliations', icon: RefreshCcw, permission: 'platform.reconciliation.view' },
                { label: 'Lifecycle Monitor', path: '/super-admin/lifecycle', icon: Activity, permission: 'platform.lifecycle.view' },
                { label: 'Alerts', path: '/super-admin/alerts', icon: AlertTriangle, permission: 'platform.alerts.view' }
            ]
        },
        {
            label: 'Communication',
            items: [
                { label: 'Announcements', path: '/super-admin/announcements', icon: Megaphone, permission: 'platform.announcements.manage' },
                { label: 'Support Center', path: '/super-admin/support', icon: LifeBuoy, permission: '*' }
            ]
        },
        {
            label: 'Platform',
            items: [
                { label: 'Feature Flags', path: '/super-admin/feature-flags', icon: Flag, permission: 'platform.overview.read' },
                { label: 'Settings', path: '/super-admin/settings', icon: Settings, permission: 'platform.settings.manage' },
                { label: 'Roles & Permissions', path: '/super-admin/roles', icon: Users, permission: 'platform.roles.manage' },
                { label: 'Sessions', path: '/super-admin/sessions', icon: KeyRound, permission: 'platform.sessions.manage' },
                { label: 'Audit Logs', path: '/super-admin/audit-logs', icon: History, permission: 'audit.logs.view' },
                { label: 'Reports', path: '/super-admin/reports', icon: BarChart3, permission: 'platform.reports.view' }
            ]
        }
    ],
    support: [{
        label: 'Help',
        items: [{ label: 'Support Center', path: '/support', icon: LifeBuoy }]
    }]
};

const readExpandedGroups = (key, activeGroupId) => {
    if (typeof window === 'undefined') return activeGroupId ? [activeGroupId] : [];
    try {
        const stored = JSON.parse(window.localStorage.getItem(key) || '[]');
        const groups = Array.isArray(stored) ? stored.filter(Boolean) : [];
        return [...new Set(activeGroupId ? [...groups, activeGroupId] : groups)];
    } catch {
        return activeGroupId ? [activeGroupId] : [];
    }
};

const VendorNavigationLink = ({ item, user, onNavigate }) => {
    const Icon = item.icon;
    const locked = !hasFeature(user, item.feature);
    if (locked) {
        return (
            <div
                title={`${FEATURE_LABELS[item.feature] || item.label} is not available on your current plan.`}
                aria-disabled="true"
                className="group flex min-h-11 cursor-not-allowed items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-400"
            >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-300" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <LockKeyhole className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-slate-300" aria-hidden="true" />
                <span className="sr-only">Locked by current plan</span>
            </div>
        );
    }
    return (
        <NavLink
            to={item.path}
            end={item.path === '/dashboard'}
            onClick={onNavigate}
            aria-label={item.label}
            className={({ isActive }) => `group flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isActive
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
        >
            <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 transition group-hover:text-slate-600" aria-hidden="true" />
            <span>{item.label}</span>
        </NavLink>
    );
};

const PlatformNavigation = ({ groups, onNavigate, user }) => (
    <nav className="space-y-5 px-4" aria-label="Platform navigation">
        {groups.map(group => {
            const visibleItems = group.items.filter(item => (
                !item.permission || hasPlatformPermission(user, item.permission)
            ));
            if (visibleItems.length === 0) return null;
            return (
                <section key={group.label} aria-labelledby={`platform-nav-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
                    <h2 id={`platform-nav-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
                        {group.label}
                    </h2>
                    <div className="space-y-1">
                        {visibleItems.map(item => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/super-admin' || item.path === '/support'}
                                    onClick={onNavigate}
                                    className={({ isActive }) => `group flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        isActive ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                                    }`}
                                >
                                    <Icon className="mr-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </div>
                </section>
            );
        })}
    </nav>
);

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const location = useLocation();
    const isPlatformUser = isPlatformRole(user?.role);
    const isSupportUser = ['SupportAgent', 'SupportLead', 'TechnicalSupport'].includes(user?.role);
    const groups = useMemo(() => filterVendorNavigation(user), [user]);
    const activeNavigation = useMemo(
        () => findActiveNavigation(groups, location.pathname),
        [groups, location.pathname]
    );
    const storageKey = getVendorNavigationStorageKey(user);
    const [navigationState, setNavigationState] = useState(() => ({
        key: storageKey,
        expandedGroups: readExpandedGroups(storageKey, activeNavigation?.group?.id)
    }));
    const expandedGroups = navigationState.key === storageKey
        ? navigationState.expandedGroups
        : readExpandedGroups(storageKey, activeNavigation?.group?.id);
    const activeGroupId = activeNavigation?.group?.id;
    const visibleExpandedGroups = useMemo(() => (
        activeGroupId && !expandedGroups.includes(activeGroupId)
            ? [...expandedGroups, activeGroupId]
            : expandedGroups
    ), [activeGroupId, expandedGroups]);

    useEffect(() => {
        if (isPlatformUser || isSupportUser || navigationState.key !== storageKey || typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(expandedGroups));
        } catch {
            // Navigation still works when browser storage is unavailable.
        }
    }, [expandedGroups, isPlatformUser, isSupportUser, navigationState.key, storageKey]);

    const toggleGroup = (groupId) => {
        setNavigationState({
            key: storageKey,
            expandedGroups: expandedGroups.includes(groupId)
                ? expandedGroups.filter(id => id !== groupId)
                : [...expandedGroups, groupId]
        });
    };
    const closeMobileNavigation = () => setIsOpen(false);

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm md:hidden"
                    onClick={closeMobileNavigation}
                    aria-label="Close navigation"
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
                isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
            }`} aria-label="Dashboard navigation">
                <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
                    <span className="text-2xl font-black tracking-tight text-slate-950">
                        {isPlatformUser || isSupportUser ? 'Platform.' : 'ScaleUp.'}
                    </span>
                    <button
                        type="button"
                        onClick={closeMobileNavigation}
                        className="-mr-2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden"
                        aria-label="Close navigation"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-5">
                    {isSupportUser ? (
                        <PlatformNavigation groups={platformNavigation.support} onNavigate={closeMobileNavigation} user={user} />
                    ) : isPlatformUser ? (
                        <PlatformNavigation groups={platformNavigation.platform} onNavigate={closeMobileNavigation} user={user} />
                    ) : (
                        <nav className="space-y-2 px-3" aria-label="Vendor navigation">
                            {groups.map(group => {
                                if (group.standalone) {
                                    return group.items.map(item => (
                                        <VendorNavigationLink key={item.id} item={item} user={user} onNavigate={closeMobileNavigation} />
                                    ));
                                }
                                const expanded = visibleExpandedGroups.includes(group.id);
                                const containsActiveRoute = activeNavigation?.group?.id === group.id;
                                return (
                                    <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
                                        <button
                                            type="button"
                                            id={`nav-group-${group.id}`}
                                            onClick={() => toggleGroup(group.id)}
                                            aria-expanded={expanded}
                                            aria-controls={`nav-items-${group.id}`}
                                            className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-black uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                containsActiveRoute ? 'text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                            }`}
                                        >
                                            <span>{group.label}</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                                        </button>
                                        {expanded && (
                                            <div id={`nav-items-${group.id}`} className="mt-1 space-y-1 pl-1">
                                                {group.items.map(item => (
                                                    <VendorNavigationLink key={item.id} item={item} user={user} onNavigate={closeMobileNavigation} />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </nav>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
