const { PLATFORM_SUPPORT_ROLES } = require('../services/support/supportConstants');

const ROLE_PERMISSIONS = Object.freeze({
    SuperAdmin: new Set(['*']),
    SupportLead: new Set([
        'support.tickets.readAll',
        'support.tickets.reply',
        'support.tickets.internalNote',
        'support.tickets.changeStatus',
        'support.tickets.changePriority',
        'support.tickets.assign',
        'support.tickets.reassign',
        'support.tickets.escalate',
        'support.tickets.close',
        'support.tickets.reopen',
        'support.staff.read',
        'support.staff.manageCapacity',
        'support.staff.manageAvailability',
        'support.knownIssues.read',
        'support.knownIssues.manage'
    ]),
    TechnicalSupport: new Set([
        'support.tickets.readAll',
        'support.tickets.reply',
        'support.tickets.internalNote',
        'support.tickets.changeStatus',
        'support.tickets.escalate',
        'support.tickets.close',
        'support.tickets.reopen',
        'support.knownIssues.read'
    ]),
    SupportAgent: new Set([
        'support.tickets.readAssigned',
        'support.tickets.reply',
        'support.tickets.changeStatus',
        'support.tickets.escalate',
        'support.tickets.reopen',
        'support.knownIssues.read'
    ])
});

const isPlatformSupportRole = (role) => PLATFORM_SUPPORT_ROLES.includes(role);

const hasSupportPermission = (role, permission) => {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.has('*') || permissions.has(permission);
};

const requirePlatformSupportRole = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: Please login first' });
    }

    if (!isPlatformSupportRole(req.user.role)) {
        return res.status(403).json({ error: 'Support access denied' });
    }

    next();
};

const requireSupportPermission = (permission) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: Please login first' });
    }

    if (!hasSupportPermission(req.user.role, permission)) {
        return res.status(403).json({ error: `Missing support permission: ${permission}` });
    }

    next();
};

module.exports = {
    ROLE_PERMISSIONS,
    isPlatformSupportRole,
    hasSupportPermission,
    requirePlatformSupportRole,
    requireSupportPermission
};
