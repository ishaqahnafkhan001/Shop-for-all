const SUPPORT_ROLES = Object.freeze(['SupportAgent', 'SupportLead', 'TechnicalSupport']);
const PLATFORM_SUPPORT_ROLES = Object.freeze([...SUPPORT_ROLES, 'SuperAdmin']);

const SUPPORT_CATEGORIES = Object.freeze([
    'products',
    'orders',
    'inventory',
    'returns',
    'promotions',
    'scheduled_sales',
    'store_builder',
    'storefront',
    'custom_domain',
    'email',
    'sms',
    'courier_pathao',
    'courier_redx',
    'staff_permissions',
    'billing',
    'account',
    'security',
    'performance',
    'other'
]);

const SUPPORT_SKILLS = Object.freeze([
    'general_support',
    ...SUPPORT_CATEGORIES
]);

const SUPPORT_PRIORITIES = Object.freeze(['low', 'normal', 'high', 'critical']);
const PRIORITY_WEIGHT = Object.freeze({ critical: 0, high: 1, normal: 2, low: 3 });

const SUPPORT_STATUSES = Object.freeze([
    'open',
    'unassigned',
    'assigned',
    'in_progress',
    'waiting_for_vendor',
    'waiting_for_engineering',
    'resolved_pending_confirmation',
    'closed',
    'reopened',
    'cancelled'
]);

const ACTIVE_CAPACITY_STATUSES = Object.freeze([
    'assigned',
    'in_progress',
    'waiting_for_vendor',
    'waiting_for_engineering',
    'reopened'
]);

const RESOLVED_STATUSES = Object.freeze([
    'resolved_pending_confirmation',
    'closed',
    'cancelled',
    'unassigned'
]);

const SUPPORT_MESSAGE_TYPES = Object.freeze([
    'vendor_message',
    'staff_message',
    'internal_note',
    'system_event',
    'resolution'
]);

const SUPPORT_AVAILABILITY = Object.freeze([
    'available',
    'busy',
    'away',
    'offline',
    'inactive'
]);

const SUPPORT_ASSIGNMENT_TYPES = Object.freeze([
    'automatic',
    'manual',
    'reassignment',
    'escalation',
    'reopen'
]);

const KNOWN_ISSUE_STATUSES = Object.freeze([
    'investigating',
    'identified',
    'monitoring',
    'resolved'
]);

const DEFAULT_SUPPORT_CONFIG = Object.freeze({
    defaultMaxActiveTickets: Number(process.env.SUPPORT_DEFAULT_MAX_ACTIVE_TICKETS || 5),
    invitationTtlHours: Number(process.env.SUPPORT_INVITATION_TTL_HOURS || 24),
    resolutionAutoCloseHours: Number(process.env.SUPPORT_RESOLUTION_AUTO_CLOSE_HOURS || 72),
    autoAssignmentEnabled: String(process.env.SUPPORT_AUTO_ASSIGNMENT_ENABLED || 'true') !== 'false'
});

module.exports = {
    SUPPORT_ROLES,
    PLATFORM_SUPPORT_ROLES,
    SUPPORT_CATEGORIES,
    SUPPORT_SKILLS,
    SUPPORT_PRIORITIES,
    PRIORITY_WEIGHT,
    SUPPORT_STATUSES,
    ACTIVE_CAPACITY_STATUSES,
    RESOLVED_STATUSES,
    SUPPORT_MESSAGE_TYPES,
    SUPPORT_AVAILABILITY,
    SUPPORT_ASSIGNMENT_TYPES,
    KNOWN_ISSUE_STATUSES,
    DEFAULT_SUPPORT_CONFIG
};
