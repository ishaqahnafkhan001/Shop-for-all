import {
    BadgeCheck,
    BarChart3,
    Bell,
    Boxes,
    CreditCard,
    FileSearch,
    FileText,
    Globe,
    History,
    Images,
    LayoutDashboard,
    LifeBuoy,
    Package,
    Palette,
    RefreshCcw,
    Settings,
    Shield,
    ShieldCheck,
    ShoppingCart,
    TicketPercent,
    TrendingUp,
    Truck,
    Users
} from 'lucide-react';
import { hasStaffPermission } from '../utils/staffPermissions';
import { hasFeature } from '../utils/featureAccess';

export const VENDOR_NAVIGATION_VERSION = 'v2';

export const vendorNavigationGroups = [
    {
        id: 'overview',
        label: 'Overview',
        standalone: true,
        items: [
            { id: 'overview', label: 'Overview', path: '/dashboard', icon: LayoutDashboard, permission: 'overview' }
        ]
    },
    {
        id: 'commerce',
        label: 'Commerce',
        items: [
            { id: 'products', label: 'Products', path: '/dashboard/products', icon: Package, permission: 'products' },
            { id: 'catalog-tools', label: 'Catalog Tools', path: '/dashboard/catalog-tools', icon: Boxes, permission: 'catalogTools', feature: 'bulkProductTools' },
            { id: 'orders', label: 'Orders', path: '/dashboard/orders', icon: ShoppingCart, permission: 'orders' },
            { id: 'returns', label: 'Returns', path: '/dashboard/returns', icon: RefreshCcw, permission: 'returns' },
            { id: 'customers', label: 'Customers', path: '/dashboard/customers', icon: Users, permission: 'customers', feature: 'customerSection' }
        ]
    },
    {
        id: 'marketing',
        label: 'Marketing',
        items: [
            { id: 'promotions', label: 'Promotions', path: '/dashboard/promotions', icon: TicketPercent, permission: 'promotions', feature: 'coupons' },
            { id: 'banners', label: 'Launch Banners', path: '/dashboard/banners', icon: Images, permission: 'bannersManage', feature: 'scheduledBanners' },
            { id: 'growth', label: 'Growth Center', path: '/dashboard/growth', icon: TrendingUp, permission: 'growthCenter', feature: 'growthCenter' },
            { id: 'analytics', label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3, permission: 'analytics', feature: 'analytics' },
            { id: 'seo', label: 'Homepage SEO', path: '/dashboard/seo', icon: FileSearch, permission: 'storeBuilder', feature: 'homepageSeo' }
        ]
    },
    {
        id: 'storefront',
        label: 'Storefront',
        items: [
            { id: 'store-builder', label: 'Store Builder', path: '/dashboard/store-builder', icon: Palette, permission: 'storeBuilder', feature: 'storeBuilder' },
            { id: 'custom-domain', label: 'Custom Domain', path: '/dashboard/domain', icon: Globe, permission: 'storeBuilder', feature: 'customDomain' },
            { id: 'shipping', label: 'Shipping', path: '/dashboard/shipping', icon: Truck, permission: 'shipping' },
            { id: 'notifications', label: 'Notifications', path: '/dashboard/notifications', icon: Bell, permission: 'notifications', feature: 'notifications' }
        ]
    },
    {
        id: 'business',
        label: 'Business',
        items: [
            { id: 'verification', label: 'Verification', path: '/dashboard/verification', icon: BadgeCheck, ownerOnly: true },
            { id: 'trusted-badge', label: 'Trusted Badge', path: '/dashboard/badges', icon: ShieldCheck, ownerOnly: true, feature: 'trustSystem' },
            { id: 'billing', label: 'Billing', path: '/dashboard/billing', icon: CreditCard, ownerOnly: true },
            { id: 'staff', label: 'Staff', path: '/dashboard/staff', icon: Shield, ownerOnly: true, feature: 'staffAccounts' },
            { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: Settings, permission: 'settings' }
        ]
    },
    {
        id: 'security-support',
        label: 'Security & Support',
        items: [
            { id: 'privacy-requests', label: 'Privacy Requests', path: '/dashboard/privacy-requests', icon: FileText, permission: 'privacyRequests', feature: 'privacyRequests' },
            { id: 'activity-logs', label: 'Activity Logs', path: '/dashboard/activity-logs', icon: History, permission: 'activityLogs', feature: 'activityLogs' },
            { id: 'support', label: 'Help & Support', path: '/dashboard/support', icon: LifeBuoy }
        ]
    }
];

export const getVendorNavigationStorageKey = (user = {}) => {
    const userId = user?._id || user?.id || 'anonymous';
    const role = user?.role || 'unknown';
    return `vendor-nav:${VENDOR_NAVIGATION_VERSION}:${userId}:${role}`;
};

export const filterVendorNavigation = (user = {}) => vendorNavigationGroups
    .map(group => ({
        ...group,
        items: group.items.filter(item => (
            (!item.ownerOnly || user?.role === 'VendorAdmin') &&
            hasStaffPermission(user, item.permission) &&
            (!item.feature || hasFeature(user, item.feature))
        ))
    }))
    .filter(group => group.items.length > 0);

export const isNavigationItemActive = (item, pathname) => item.path === '/dashboard'
    ? pathname === item.path
    : pathname.startsWith(item.path);

export const findActiveNavigation = (groups, pathname) => groups
    .flatMap(group => group.items.map(item => ({ group, item })))
    .filter(({ item }) => isNavigationItemActive(item, pathname))
    .sort((left, right) => right.item.path.length - left.item.path.length)[0] || null;
