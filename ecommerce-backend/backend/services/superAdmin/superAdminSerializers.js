const { FEATURE_KEYS } = require('../../config/subscriptionFeatures');
const {
    maskNidNumber,
    serializeVerificationPrivacy
} = require('../vendorVerificationPrivacyService');
const { maskPhone } = require('../../utils/phoneUtils');

const toPlain = (value) => {
    if (!value) return null;
    return value.toObject ? value.toObject() : value;
};

const idOf = (value) => {
    if (!value) return null;
    if (value._id) return value._id;
    return value;
};

const serializeOwnerSummary = (owner) => {
    const plain = toPlain(owner);
    if (!plain) return null;
    return {
        id: idOf(plain),
        _id: idOf(plain),
        fullName: plain.fullName || '',
        email: plain.email || '',
        status: plain.status || ''
    };
};

const serializePlanSummary = (plan) => {
    const plain = toPlain(plan);
    if (!plain) return null;
    return {
        id: idOf(plain),
        name: plain.name || '',
        slug: plain.slug || '',
        monthlyPrice: Number(plain.monthlyPrice) || 0,
        yearlyPrice: Number(plain.yearlyPrice) || 0
    };
};

const serializeLegacyShopPlan = (plan = {}) => ({
    name: plan?.name || '',
    status: plan?.status || '',
    renewsAt: plan?.renewsAt || null,
    productLimit: plan?.productLimit ?? null,
    activePlanName: plan?.activePlanName || '',
    activePlanSlug: plan?.activePlanSlug || ''
});

const serializeFeatureFlags = (featureFlags = {}) => Object.fromEntries(
    FEATURE_KEYS.map(key => [key, featureFlags?.[key] === true])
);

const serializeDomainSummary = (customDomain = {}) => ({
    domain: customDomain?.domain || '',
    status: customDomain?.status || 'NotConfigured',
    adminNote: customDomain?.adminNote || '',
    ownershipVerified: customDomain?.ownershipVerified === true,
    routingVerified: customDomain?.routingVerified === true,
    manuallyVerifiedRouting: customDomain?.manuallyVerifiedRouting === true,
    verifiedAt: customDomain?.verifiedAt || null,
    lastCheckedAt: customDomain?.lastCheckedAt || null,
    lastDnsCheckStatus: customDomain?.lastDnsCheckStatus || '',
    lastDnsCheckError: customDomain?.lastDnsCheckError || '',
    lastOwnershipCheckStatus: customDomain?.lastOwnershipCheckStatus || '',
    lastRoutingCheckStatus: customDomain?.lastRoutingCheckStatus || ''
});

const serializeShopVerificationState = (verification = {}) => ({
    status: verification?.status || 'not_submitted',
    deadline: verification?.deadline || null,
    submittedAt: verification?.submittedAt || null,
    approvedAt: verification?.approvedAt || null,
    rejectedAt: verification?.rejectedAt || null,
    phoneVerified: verification?.phoneVerified === true,
    phoneVerifiedAt: verification?.phoneVerifiedAt || null
});

const serializeSuperAdminShopListItem = (shop) => {
    const plain = toPlain(shop) || {};
    return {
        _id: idOf(plain),
        shopName: plain.shopName || '',
        displayName: plain.displayName || '',
        subdomain: plain.subdomain || '',
        approvalStatus: plain.approvalStatus || 'Pending',
        isActive: plain.isActive !== false,
        suspensionReason: plain.suspensionReason || '',
        plan: serializeLegacyShopPlan(plain.plan),
        featureFlags: serializeFeatureFlags(plain.featureFlags),
        verification: serializeShopVerificationState(plain.verification),
        badgeStatus: plain.badgeStatus || 'none',
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null
    };
};

const serializeSuperAdminShopDetail = (shop) => {
    const plain = toPlain(shop) || {};
    return {
        ...serializeSuperAdminShopListItem(plain),
        badgeType: plain.badgeType || '',
        badgeApprovedAt: plain.badgeApprovedAt || null,
        badgeExpiresAt: plain.badgeExpiresAt || null,
        badgeRevokedAt: plain.badgeRevokedAt || null,
        badgeRevokedReason: plain.badgeRevokedReason || '',
        customDomain: serializeDomainSummary(plain.customDomain)
    };
};

const serializeVerificationSummary = (verification, extra = {}) => {
    if (!verification) return null;
    const safe = serializeVerificationPrivacy(verification, { includeFullNid: false });
    const maskedNid = maskNidNumber(safe.nidNumberMasked || safe.nidNumber || '');
    return {
        _id: idOf(safe),
        shop_id: idOf(safe.shop_id),
        owner_id: idOf(safe.owner_id),
        status: safe.status || 'not_submitted',
        nidName: safe.nidName || '',
        nidNumber: maskedNid,
        nidNumberMasked: maskedNid,
        verificationDeadline: safe.verificationDeadline || null,
        submittedAt: safe.submittedAt || null,
        approvedAt: safe.approvedAt || null,
        rejectedAt: safe.rejectedAt || null,
        rejectionReason: safe.rejectionReason || '',
        documents: safe.documents || {},
        overallVerification: safe.overallVerification || null,
        shop: safe.shop ? {
            _id: idOf(safe.shop),
            shopName: safe.shop.shopName || '',
            subdomain: safe.shop.subdomain || '',
            isActive: safe.shop.isActive !== false,
            approvalStatus: safe.shop.approvalStatus || '',
            suspensionReason: safe.shop.suspensionReason || '',
            verification: serializeShopVerificationState(safe.shop.verification),
            createdAt: safe.shop.createdAt || null
        } : null,
        owner: serializeOwnerSummary(safe.owner),
        reviewer: serializeOwnerSummary(safe.reviewer),
        createdAt: safe.createdAt || null,
        updatedAt: safe.updatedAt || null,
        ...extra
    };
};

const serializeSubscriptionSummary = (subscription, options = {}) => {
    const plain = toPlain(subscription);
    if (!plain) return null;
    return {
        id: idOf(plain),
        shopId: idOf(plain.shopId),
        planId: idOf(plain.planId),
        activePlanName: plain.activePlanName || '',
        activePlanSlug: plain.activePlanSlug || '',
        intendedPlanId: idOf(plain.intendedPlanId),
        intendedPlanName: plain.intendedPlanName || '',
        intendedPlanSlug: plain.intendedPlanSlug || '',
        status: plain.status || '',
        paymentReviewStatus: plain.paymentReviewStatus || 'none',
        billingCycle: plain.billingCycle || 'monthly',
        pendingPlanId: idOf(plain.pendingPlanId),
        pendingPlanName: plain.pendingPlanName || '',
        pendingPlanSlug: plain.pendingPlanSlug || '',
        pendingPlanEffectiveAt: plain.pendingPlanEffectiveAt || null,
        trialStartedAt: plain.trialStartedAt || null,
        trialEndsAt: plain.trialEndsAt || null,
        currentPeriodStart: plain.currentPeriodStart || null,
        currentPeriodEnd: plain.currentPeriodEnd || null,
        graceEndsAt: plain.graceEndsAt || null,
        suspendedAt: plain.suspendedAt || null,
        suspensionReason: plain.suspensionReason || '',
        cancelledAt: plain.cancelledAt || null,
        lastInvoiceId: idOf(plain.lastInvoiceId),
        entitlementVersion: Number(plain.entitlementVersion) || 0,
        version: Number(plain.__v) || 0,
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
        allowedActions: Array.isArray(options.allowedActions) ? options.allowedActions : undefined
    };
};

const serializeInvoiceSummary = (invoice) => {
    const plain = toPlain(invoice);
    if (!plain) return null;
    return {
        id: idOf(plain),
        shopId: idOf(plain.shopId),
        subscriptionId: idOf(plain.subscriptionId),
        planId: idOf(plain.planId),
        planName: plain.planName || '',
        planSlug: plain.planSlug || '',
        invoiceNumber: plain.invoiceNumber || '',
        amount: Number(plain.amount) || 0,
        currency: plain.currency || 'BDT',
        billingCycle: plain.billingCycle || 'monthly',
        status: plain.status || '',
        dueDate: plain.dueDate || null,
        paidAt: plain.paidAt || null,
        notes: plain.notes || '',
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null
    };
};

const serializePaymentSummary = (payment) => {
    const plain = toPlain(payment);
    if (!plain) return null;
    return {
        id: idOf(plain),
        shopId: idOf(plain.shopId),
        invoiceId: idOf(plain.invoiceId),
        planId: idOf(plain.planId),
        planName: plain.planName || '',
        planSlug: plain.planSlug || '',
        provider: plain.provider || '',
        amount: Number(plain.amount) || 0,
        transactionId: plain.transactionId || '',
        senderNumber: maskPhone(plain.senderNumber || ''),
        proofAvailable: Boolean(plain.screenshotUrl),
        status: plain.status || '',
        submittedBy: idOf(plain.submittedBy),
        verifiedBy: idOf(plain.verifiedBy),
        verifiedAt: plain.verifiedAt || null,
        rejectionReason: plain.rejectionReason || '',
        adminNote: plain.adminNote || '',
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null
    };
};

const serializeAnnouncementSummary = (announcement) => {
    const plain = toPlain(announcement);
    if (!plain) return null;
    return {
        id: idOf(plain),
        _id: idOf(plain),
        title: plain.title || '',
        message: plain.message || '',
        audience: plain.audience || 'All',
        targetAudience: plain.targetAudience || 'all_vendors',
        targetPlan: plain.targetPlan || '',
        targetPlans: Array.isArray(plain.targetPlans) ? plain.targetPlans : [],
        targetStatuses: Array.isArray(plain.targetStatuses) ? plain.targetStatuses : [],
        targetPlanId: idOf(plain.targetPlanId),
        targetShopId: idOf(plain.targetShopId),
        severity: plain.severity || 'Info',
        isActive: plain.isActive !== false,
        isPublished: plain.isPublished === true,
        publishedAt: plain.publishedAt || null,
        startAt: plain.startAt || null,
        expiresAt: plain.expiresAt || null,
        archivedAt: plain.archivedAt || null,
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
        version: Number(plain.__v) || 0
    };
};

const serializeAbuseReportSummary = (report, { includeReporter = false } = {}) => {
    const plain = toPlain(report);
    if (!plain) return null;
    const shop = plain.shop_id && typeof plain.shop_id === 'object' ? plain.shop_id : null;
    return {
        id: idOf(plain),
        _id: idOf(plain),
        shopId: idOf(plain.shop_id),
        shop: shop ? {
            id: idOf(shop),
            shopName: shop.shopName || '',
            subdomain: shop.subdomain || '',
            approvalStatus: shop.approvalStatus || '',
            isActive: shop.isActive !== false
        } : null,
        reporterEmail: includeReporter ? plain.reporterEmail || '' : '',
        reporterAvailable: Boolean(plain.reporterEmail),
        reason: plain.reason || '',
        details: plain.details || '',
        status: plain.status || 'Open',
        internalNote: plain.internalNote || '',
        resolutionReason: plain.resolutionReason || '',
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
        version: Number(plain.__v) || 0
    };
};

const serializeJobSummary = (job) => {
    const plain = toPlain(job);
    if (!plain) return null;
    const shop = plain.shop_id && typeof plain.shop_id === 'object' ? plain.shop_id : null;
    return {
        id: idOf(plain),
        _id: idOf(plain),
        queue: plain.queue || '',
        name: plain.name || '',
        shopId: idOf(plain.shop_id),
        shop: shop ? {
            id: idOf(shop),
            shopName: shop.shopName || '',
            subdomain: shop.subdomain || ''
        } : null,
        status: plain.status || '',
        attempts: Number(plain.attempts) || 0,
        maxAttempts: Number(plain.maxAttempts) || 0,
        runAt: plain.runAt || null,
        lockedAt: plain.lockedAt || null,
        lockActive: Boolean(plain.lockedAt && plain.status === 'running'),
        lastError: plain.lastError || '',
        cancelledAt: plain.cancelledAt || null,
        cancellationReason: plain.cancellationReason || '',
        entitlementVersion: plain.entitlementVersion ?? null,
        hasPayload: Boolean(plain.payload && Object.keys(plain.payload).length),
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
        version: Number(plain.__v) || 0
    };
};

const serializeReconciliationSummary = (subscription) => {
    const plain = toPlain(subscription);
    if (!plain) return null;
    const reconciliation = plain.reconciliation || {};
    const shop = plain.shopId && typeof plain.shopId === 'object' ? plain.shopId : null;
    return {
        subscriptionId: idOf(plain),
        shopId: idOf(plain.shopId),
        shop: shop ? {
            id: idOf(shop),
            shopName: shop.shopName || '',
            subdomain: shop.subdomain || ''
        } : null,
        activePlanName: plain.activePlanName || '',
        activePlanSlug: plain.activePlanSlug || '',
        subscriptionStatus: plain.status || '',
        operationId: reconciliation.operationId || '',
        type: reconciliation.reconciliationType || '',
        targetPlanName: reconciliation.targetPlanName || '',
        targetPlanSlug: reconciliation.targetPlanSlug || '',
        status: reconciliation.status || 'idle',
        attempts: Number(reconciliation.attempts) || 0,
        maxAttempts: Number(reconciliation.maxAttempts) || 0,
        lastAttemptAt: reconciliation.lastAttemptAt || null,
        nextRetryAt: reconciliation.nextRetryAt || null,
        lastError: reconciliation.lastError || '',
        scheduledAt: reconciliation.scheduledAt || null,
        startedAt: reconciliation.startedAt || null,
        completedAt: reconciliation.completedAt || null,
        forced: reconciliation.forced === true,
        reason: reconciliation.reason || '',
        summary: redactAuditMetadata(reconciliation.summary || {}),
        updatedAt: plain.updatedAt || null,
        version: Number(plain.__v) || 0
    };
};

const serializeWorkerLeaseSummary = (lease, now = new Date()) => {
    const plain = toPlain(lease);
    if (!plain) return null;
    const lockedUntil = plain.lockedUntil ? new Date(plain.lockedUntil) : null;
    return {
        id: idOf(plain),
        key: plain.key || '',
        status: lockedUntil && lockedUntil > now ? 'running' : (plain.lastError ? 'failed' : 'idle'),
        lockedUntil: plain.lockedUntil || null,
        lastStartedAt: plain.lastStartedAt || null,
        lastCompletedAt: plain.lastCompletedAt || null,
        attempts: Number(plain.attempts) || 0,
        lastError: plain.lastError || '',
        lastSummary: redactAuditMetadata(plain.lastSummary || {}),
        updatedAt: plain.updatedAt || null
    };
};

const serializePlanConfiguration = (plan) => {
    const plain = toPlain(plan);
    if (!plain) return null;
    return {
        ...serializePlanSummary(plain),
        _id: idOf(plain),
        currency: plain.currency || 'BDT',
        limits: plain.limits || {},
        features: Object.fromEntries(
            FEATURE_KEYS.map(key => [key, plain.features?.[key] === true])
        ),
        storeBuilderAccess: plain.storeBuilderAccess || 'none',
        storeBuilderCapabilities: plain.storeBuilderCapabilities || {},
        badgeEligible: plain.badgeEligible === true,
        prioritySupport: plain.prioritySupport === true,
        isActive: plain.isActive !== false,
        configRevision: Number(plain.configRevision) || 0,
        planConfigVersion: Number(plain.planConfigVersion) || 0,
        lastSyncedAt: plain.lastSyncedAt || null,
        version: Number(plain.__v) || 0,
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null
    };
};

const SENSITIVE_KEY_PATTERN = /(token|secret|password|credential|authorization|nidnumber|documenturl|storagekey|encryption|refreshtoken|accesstoken|publicid|screenshoturl)/i;
const URL_PATTERN = /^(?:https?:|data:|blob:)/i;

const redactAuditMetadata = (value, depth = 0) => {
    if (depth > 6) return '[TRUNCATED]';
    if (Array.isArray(value)) return value.slice(0, 50).map(item => redactAuditMetadata(item, depth + 1));
    if (!value || typeof value !== 'object') {
        if (typeof value === 'string' && URL_PATTERN.test(value.trim())) return '[REDACTED_URL]';
        return value;
    }

    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactAuditMetadata(nested, depth + 1)
    ]));
};

const serializePlatformAuditEvent = (audit) => {
    const plain = toPlain(audit) || {};
    return {
        _id: idOf(plain),
        actorName: plain.actorName || '',
        actorEmail: plain.actorEmail || '',
        actorRole: plain.actorRole || '',
        action: plain.action || '',
        entityType: plain.entityType || '',
        entityId: idOf(plain.entityId),
        entityLabel: plain.entityLabel || '',
        shop_id: plain.shop_id && typeof plain.shop_id === 'object'
            ? {
                _id: idOf(plain.shop_id),
                shopName: plain.shop_id.shopName || '',
                subdomain: plain.shop_id.subdomain || ''
            }
            : idOf(plain.shop_id),
        message: plain.message || '',
        reason: plain.reason || '',
        metadata: redactAuditMetadata(plain.metadata || {}),
        severity: plain.severity || 'info',
        createdAt: plain.createdAt || null
    };
};

module.exports = {
    redactAuditMetadata,
    serializeAbuseReportSummary,
    serializeAnnouncementSummary,
    serializeDomainSummary,
    serializeInvoiceSummary,
    serializeJobSummary,
    serializeOwnerSummary,
    serializePaymentSummary,
    serializePlanConfiguration,
    serializePlanSummary,
    serializePlatformAuditEvent,
    serializeReconciliationSummary,
    serializeSubscriptionSummary,
    serializeSuperAdminShopDetail,
    serializeSuperAdminShopListItem,
    serializeVerificationSummary,
    serializeWorkerLeaseSummary
};
