export const PLATFORM_ROLES = Object.freeze([
    'SuperAdmin',
    'BillingAdmin',
    'ComplianceReviewer',
    'TrustModerator',
    'PlatformOps',
    'SecurityAuditor'
]);

export const isPlatformRole = role => PLATFORM_ROLES.includes(String(role || ''));

export const hasPlatformPermission = (user, permission) => {
    const permissions = Array.isArray(user?.platformPermissions)
        ? user.platformPermissions
        : [];
    return permissions.includes('*') || permissions.includes(permission);
};

export const getPlatformHomePath = (user) => {
    if (hasPlatformPermission(user, 'platform.overview.read')) return '/super-admin';
    if (hasPlatformPermission(user, 'billing.read')) return '/super-admin/billing';
    if (hasPlatformPermission(user, 'compliance.verification.read')) return '/super-admin/vendor-verifications';
    if (hasPlatformPermission(user, 'trust.badges.read')) return '/super-admin/badges';
    if (hasPlatformPermission(user, 'audit.logs.view')) return '/super-admin/audit-logs';
    return '/login';
};
