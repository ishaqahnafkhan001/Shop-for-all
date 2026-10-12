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
    Search,
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
    support: [
        {
            label: 'Help',
            items: [
                { label: 'Support Center', path: '/support', icon: LifeBuoy }
            ]
        }
    ]
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

const navigationLinkClass = (isActive) => [
    'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
    'transition-colors duration-150 motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
    isActive
        ? 'bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-inset ring-indigo-100 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-indigo-600'
        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950'
].join(' ');

const NavigationSearch = ({ value, onChange }) => (
    <div className="px-3 pb-4 pt-4">
        <div className="group relative">
            <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500"
                aria-hidden="true"
            />
            <input
                type="text"
                inputMode="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Search navigation"
                aria-label="Search navigation"
                className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Clear navigation search"
                >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            )}
        </div>
    </div>
);

const EmptySearchState = () => (
    <div className="mx-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <Search className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-slate-700">No pages found</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Try another search term.</p>
    </div>
);

const VendorNavigationLink = ({ item, user, onNavigate }) => {
    const Icon = item.icon;
    const locked = !hasFeature(user, item.feature);

    if (locked) {
        const unavailableFeature = FEATURE_LABELS[item.feature] || item.label;

        return (
            <div
                title={`${unavailableFeature} is not available on your current plan.`}
                aria-disabled="true"
                className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400"
            >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <LockKeyhole className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" aria-hidden="true" />
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
            className={({ isActive }) => navigationLinkClass(isActive)}
        >
            {({ isActive }) => (
                <>
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100'
                            : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {isActive && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-600" aria-hidden="true" />}
                </>
            )}
        </NavLink>
    );
};

const PlatformNavigation = ({ groups, onNavigate, user, searchQuery }) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const visibleGroups = groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                const canAccess = !item.permission || hasPlatformPermission(user, item.permission);
                const matchesSearch = !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery);
                return canAccess && matchesSearch;
            })
        }))
        .filter((group) => group.items.length > 0);

    if (visibleGroups.length === 0) return <EmptySearchState />;

    return (
        <nav className="space-y-6 px-3 pb-4" aria-label="Platform navigation">
            {visibleGroups.map((group) => {
                const headingId = `platform-nav-${group.label.replace(/\s+/g, '-').toLowerCase()}`;

                return (
                    <section key={group.label} aria-labelledby={headingId}>
                        <h2
                            id={headingId}
                            className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
                        >
                            {group.label}
                        </h2>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/super-admin' || item.path === '/support'}
                                        onClick={onNavigate}
                                        className={({ isActive }) => navigationLinkClass(isActive)}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                    isActive
                                                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100'
                                                        : 'text-slate-400 group-hover:text-slate-600'
                                                }`}>
                                                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                                {isActive && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-600" aria-hidden="true" />}
                                            </>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </nav>
    );
};

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
    const activeGroupId = activeNavigation?.group?.id;
    const storageKey = getVendorNavigationStorageKey(user);
    const [navigationState, setNavigationState] = useState(() => ({
        key: storageKey,
        pathname: location.pathname,
        expandedGroups: readExpandedGroups(storageKey, activeGroupId)
    }));
    const [searchQuery, setSearchQuery] = useState('');
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const expandedGroups = useMemo(() => {
        const storedGroups = navigationState.key === storageKey
            ? navigationState.expandedGroups
            : readExpandedGroups(storageKey, activeGroupId);
        return navigationState.pathname !== location.pathname && activeGroupId
            ? [...new Set([...storedGroups, activeGroupId])]
            : storedGroups;
    }, [navigationState, storageKey, activeGroupId, location.pathname]);

    const filteredVendorGroups = useMemo(() => {
        if (!normalizedQuery) return groups;

        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery))
            }))
            .filter((group) => group.items.length > 0);
    }, [groups, normalizedQuery]);

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
            pathname: location.pathname,
            expandedGroups: expandedGroups.includes(groupId)
                ? expandedGroups.filter((id) => id !== groupId)
                : [...expandedGroups, groupId]
        });
    };

    const closeMobileNavigation = () => setIsOpen(false);
    const BrandIcon = isSupportUser ? LifeBuoy : isPlatformUser ? ShieldCheck : PanelsTopLeft;
    const brandTitle = isSupportUser ? 'Support Desk' : isPlatformUser ? 'Platform Console' : 'ScaleUp';
    const brandSubtitle = isSupportUser ? 'CUSTOMER CARE' : isPlatformUser ? 'OPERATIONS' : 'SELLER WORKSPACE';

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden"
                    onClick={closeMobileNavigation}
                    aria-label="Close navigation"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200/80 bg-white shadow-[8px_0_30px_-24px_rgba(15,23,42,0.25)] transition-transform duration-300 ease-out motion-reduce:transition-none md:static md:translate-x-0 md:shadow-none ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                aria-label="Dashboard navigation"
            >
                <header className="flex h-[76px] flex-shrink-0 items-center justify-between border-b border-slate-100 px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-white/20">
                            <BrandIcon className="h-[19px] w-[19px]" strokeWidth={2.2} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-950">{brandTitle}</p>
                            <p className="mt-0.5 text-[9px] font-bold tracking-[0.16em] text-slate-400">{brandSubtitle}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={closeMobileNavigation}
                        className="-mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
                        aria-label="Close navigation"
                    >
                        <X className="h-[18px] w-[18px]" aria-hidden="true" />
                    </button>
                </header>

                <NavigationSearch value={searchQuery} onChange={setSearchQuery} />

                <div className="min-h-0 flex-1 overflow-y-auto pb-3">
                    {isSupportUser ? (
                        <PlatformNavigation
                            groups={platformNavigation.support}
                            onNavigate={closeMobileNavigation}
                            user={user}
                            searchQuery={searchQuery}
                        />
                    ) : isPlatformUser ? (
                        <PlatformNavigation
                            groups={platformNavigation.platform}
                            onNavigate={closeMobileNavigation}
                            user={user}
                            searchQuery={searchQuery}
                        />
                    ) : filteredVendorGroups.length === 0 ? (
                        <EmptySearchState />
                    ) : (
                        <nav className="space-y-1.5 px-3 pb-4" aria-label="Vendor navigation">
                            {filteredVendorGroups.map((group) => {
                                if (group.standalone) {
                                    return group.items.map((item) => (
                                        <VendorNavigationLink
                                            key={item.id}
                                            item={item}
                                            user={user}
                                            onNavigate={closeMobileNavigation}
                                        />
                                    ));
                                }

                                const expanded = Boolean(normalizedQuery) || expandedGroups.includes(group.id);
                                const containsActiveRoute = activeNavigation?.group?.id === group.id;
                                const headingId = `nav-group-${group.id}`;
                                const itemsId = `nav-items-${group.id}`;

                                return (
                                    <section key={group.id} aria-labelledby={headingId}>
                                        <button
                                            type="button"
                                            id={headingId}
                                            onClick={() => toggleGroup(group.id)}
                                            aria-expanded={expanded}
                                            aria-controls={itemsId}
                                            className={`group flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                                                containsActiveRoute
                                                    ? 'text-indigo-700 hover:bg-indigo-50/70'
                                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                                            }`}
                                        >
                                            <span className="truncate">{group.label}</span>
                                            <ChevronDown
                                                className={`ml-2 h-4 w-4 flex-shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                                                    expanded ? 'rotate-180' : ''
                                                }`}
                                                aria-hidden="true"
                                            />
                                        </button>

                                        <div
                                            id={itemsId}
                                            hidden={!expanded}
                                            className="mt-1 space-y-1 pl-1"
                                        >
                                            {group.items.map((item) => (
                                                <VendorNavigationLink
                                                    key={item.id}
                                                    item={item}
                                                    user={user}
                                                    onNavigate={closeMobileNavigation}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </nav>
                    )}
                </div>

                <footer className="flex flex-shrink-0 items-center gap-2.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-600">Access-controlled menu</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Based on your role and plan</p>
                    </div>
                </footer>
            </aside>
        </>
    );
};

export default Sidebar;
