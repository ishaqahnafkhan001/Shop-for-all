const PLATFORM_ROLES = Object.freeze([
    'SuperAdmin',
    'BillingAdmin',
    'ComplianceReviewer',
    'TrustModerator',
    'PlatformOps',
    'SecurityAuditor',
    'SupportAgent',
    'SupportLead',
    'TechnicalSupport'
]);

const PLATFORM_PERMISSION_REGISTRY = Object.freeze([
    { key: 'platform.overview.read', label: 'View platform overview', category: 'Platform' },
    { key: 'platform.shops.read', label: 'View shops', category: 'Shops' },
    { key: 'platform.shops.manage', label: 'Manage shop operations', category: 'Shops' },
    { key: 'platform.shops.suspend', label: 'Suspend shops', category: 'Shops' },
    { key: 'platform.shops.restore', label: 'Restore shops', category: 'Shops' },
    { key: 'platform.shops.notes.manage', label: 'Manage internal shop notes', category: 'Shops' },
    { key: 'billing.read', label: 'View billing', category: 'Billing' },
    { key: 'billing.payments.review', label: 'Review payments', category: 'Billing' },
    { key: 'billing.payments.reject', label: 'Reject payments', category: 'Billing' },
    { key: 'billing.subscriptions.modify', label: 'Modify subscriptions', category: 'Billing' },
    { key: 'billing.subscriptions.extend', label: 'Extend subscriptions', category: 'Billing' },
    { key: 'billing.subscriptions.renew', label: 'Renew subscriptions', category: 'Billing' },
    { key: 'billing.plans.manage', label: 'Manage plans', category: 'Billing' },
    { key: 'billing.invoices.manage', label: 'Manage invoices', category: 'Billing' },
    { key: 'billing.refunds.manage', label: 'Manage refunds', category: 'Billing' },
    { key: 'compliance.verification.read', label: 'View verification cases', category: 'Compliance' },
    { key: 'compliance.verification.review', label: 'Review verification cases', category: 'Compliance' },
    { key: 'compliance.documents.view', label: 'View protected verification documents', category: 'Compliance' },
    { key: 'trust.badges.read', label: 'View badge cases', category: 'Trust' },
    { key: 'trust.badges.review', label: 'Review badge cases', category: 'Trust' },
    { key: 'trust.badges.revoke', label: 'Revoke badges', category: 'Trust' },
    { key: 'platform.domains.view', label: 'View domains', category: 'Operations' },
    { key: 'platform.domains.manage', label: 'Manage domains', category: 'Operations' },
    { key: 'platform.shipping.view', label: 'View shipping operations', category: 'Operations' },
    { key: 'platform.shipping.manage', label: 'Manage shipping operations', category: 'Operations' },
    { key: 'workers.jobs.view', label: 'View background jobs', category: 'Reliability' },
    { key: 'workers.jobs.retry', label: 'Retry background jobs', category: 'Reliability' },
    { key: 'workers.jobs.cancel', label: 'Cancel background jobs', category: 'Reliability' },
    { key: 'workers.locks.manage', label: 'Release stale worker locks', category: 'Reliability' },
    { key: 'platform.reconciliation.view', label: 'View reconciliations', category: 'Reliability' },
    { key: 'platform.reconciliation.retry', label: 'Retry reconciliations', category: 'Reliability' },
    { key: 'platform.lifecycle.view', label: 'View lifecycle monitor', category: 'Reliability' },
    { key: 'platform.lifecycle.manage', label: 'Run lifecycle repairs', category: 'Reliability' },
    { key: 'platform.alerts.view', label: 'View operational alerts', category: 'Reliability' },
    { key: 'platform.announcements.manage', label: 'Manage announcements', category: 'Communication' },
    { key: 'platform.settings.manage', label: 'Manage platform settings', category: 'Platform' },
    { key: 'platform.features.manage', label: 'Manage feature rollouts', category: 'Platform' },
    { key: 'platform.roles.manage', label: 'Manage platform roles', category: 'Security' },
    { key: 'platform.sessions.manage', label: 'Manage platform sessions', category: 'Security' },
    { key: 'support.tickets.view', label: 'View support tickets', category: 'Support' },
    { key: 'support.tickets.manage', label: 'Manage support tickets', category: 'Support' },
    { key: 'platform.abuse.manage', label: 'Manage abuse reports', category: 'Risk' },
    { key: 'risk.cases.view', label: 'View risk cases', category: 'Risk' },
    { key: 'risk.cases.manage', label: 'Manage risk cases', category: 'Risk' },
    { key: 'audit.logs.view', label: 'View platform audit logs', category: 'Audit' },
    { key: 'audit.logs.export', label: 'Export platform audit logs', category: 'Audit' },
    { key: 'platform.reports.view', label: 'View platform reports', category: 'Reporting' },
    { key: 'platform.reports.export', label: 'Export platform reports', category: 'Reporting' }
]);

const PLATFORM_ROLE_PERMISSIONS = Object.freeze({
    SuperAdmin: Object.freeze(['*']),
    BillingAdmin: Object.freeze([
        'platform.overview.read',
        'billing.read',
        'billing.payments.review',
        'billing.payments.reject',
        'billing.subscriptions.modify',
        'billing.subscriptions.extend',
        'billing.subscriptions.renew',
        'billing.plans.manage',
        'billing.invoices.manage',
        'billing.refunds.manage',
        'platform.reconciliation.view',
        'platform.lifecycle.view',
        'platform.alerts.view',
        'platform.reports.view',
        'audit.logs.view'
    ]),
    ComplianceReviewer: Object.freeze([
        'compliance.verification.read',
        'compliance.verification.review',
        'compliance.documents.view',
        'audit.logs.view'
    ]),
    TrustModerator: Object.freeze([
        'trust.badges.read',
        'trust.badges.review',
        'trust.badges.revoke',
        'audit.logs.view'
    ]),
    PlatformOps: Object.freeze([
        'platform.overview.read',
        'platform.shops.read',
        'platform.shops.manage',
        'platform.shops.suspend',
        'platform.shops.restore',
        'platform.shops.notes.manage',
        'platform.domains.view',
        'platform.domains.manage',
        'platform.shipping.view',
        'platform.shipping.manage',
        'workers.jobs.view',
        'workers.jobs.retry',
        'workers.jobs.cancel',
        'workers.locks.manage',
        'platform.reconciliation.view',
        'platform.reconciliation.retry',
        'platform.lifecycle.view',
        'platform.lifecycle.manage',
        'platform.alerts.view',
        'platform.announcements.manage',
        'platform.settings.manage',
        'platform.features.manage',
        'platform.abuse.manage',
        'risk.cases.view',
        'risk.cases.manage',
        'audit.logs.view'
    ]),
    SecurityAuditor: Object.freeze([
        'platform.overview.read',
        'platform.shops.read',
        'compliance.verification.read',
        'workers.jobs.view',
        'platform.reconciliation.view',
        'platform.lifecycle.view',
        'platform.alerts.view',
        'risk.cases.view',
        'platform.reports.view',
        'audit.logs.view',
        'audit.logs.export'
    ]),
    SupportAgent: Object.freeze([
        'platform.shops.read',
        'support.tickets.view',
        'support.tickets.manage'
    ]),
    SupportLead: Object.freeze([
        'platform.shops.read',
        'support.tickets.view',
        'support.tickets.manage',
        'risk.cases.view'
    ]),
    TechnicalSupport: Object.freeze([
        'platform.shops.read',
        'platform.domains.view',
        'platform.shipping.view',
        'workers.jobs.view',
        'platform.reconciliation.view',
        'platform.lifecycle.view',
        'support.tickets.view',
        'support.tickets.manage'
    ])
});

const isPlatformRole = (role) => PLATFORM_ROLES.includes(String(role || ''));

const hasPlatformPermission = (role, permission) => {
    const permissions = PLATFORM_ROLE_PERMISSIONS[role] || [];
    return permissions.includes('*') || permissions.includes(permission);
};

module.exports = {
    PLATFORM_PERMISSION_REGISTRY,
    PLATFORM_ROLES,
    PLATFORM_ROLE_PERMISSIONS,
    hasPlatformPermission,
    isPlatformRole
};
