const BadgeApplication = require('../../models/BadgeApplication');
const Review = require('../../models/Review');
const AbuseReport = require('../../models/AbuseReport');
const Job = require('../../models/Job');
const User = require('../../models/User');
const { createNotification } = require('../notificationService');
const { logPlatformAudit } = require('../platformAuditLogService');
const { BADGE_THRESHOLDS, getEligibilitySnapshot } = require('./badgeEligibilityService');

const NEGATIVE_KEYWORDS = [
    'fake',
    'fraud',
    'scam',
    'broken',
    'damaged',
    'late',
    'refund',
    'rude',
    'not original',
    'bad quality',
    'never received'
];

const scoreSnapshot = (snapshot, negativeReviewCount = 0) => {
    const positives = [];
    const risks = [];
    let score = 0;

    const add = (condition, points, positive, risk) => {
        if (condition) {
            score += points;
            positives.push(positive);
        } else if (risk) {
            risks.push(risk);
        }
    };

    add(snapshot.verificationStatus === 'approved', 20, 'Vendor identity is NID verified.', 'Vendor verification is not approved.');
    add(snapshot.subscriptionStatus === 'active' && ['Growth', 'Pro'].includes(snapshot.plan), 10, 'Vendor is on an active Growth/Pro subscription.', 'Vendor does not have an active Growth/Pro subscription.');
    add(snapshot.completedSales >= BADGE_THRESHOLDS.minCompletedSales, 20, 'Store has enough delivered sales history.', 'Delivered sales are below badge requirement.');
    add(snapshot.shopAgeDays >= BADGE_THRESHOLDS.minShopAgeDays, 10, 'Store has enough age/history.', 'Store is too new for badge approval.');
    add(snapshot.facebookLinkPresent, 5, 'Facebook page link is present.', 'Facebook page link is missing.');
    add(snapshot.averageRating >= BADGE_THRESHOLDS.minAverageRating, 15, 'Average product rating meets the threshold.', 'Average product rating is below threshold.');
    add(snapshot.reviewCount >= BADGE_THRESHOLDS.minReviewCount, 10, 'Store has enough customer reviews.', 'Review count is below threshold.');
    add(snapshot.unresolvedAbuseReports <= BADGE_THRESHOLDS.maxUnresolvedAbuseReports, 10, 'No unresolved abuse reports were found.', 'Unresolved abuse reports require Super Admin attention.');

    if (negativeReviewCount > 0) {
        const penalty = Math.min(15, negativeReviewCount * 3);
        score = Math.max(0, score - penalty);
        risks.push(`${negativeReviewCount} review(s) contain serious negative complaint keywords.`);
    }

    if (snapshot.refundRate > BADGE_THRESHOLDS.maxRefundRate) {
        score = Math.max(0, score - 10);
        risks.push(`Refund/return signal is elevated at ${Math.round(snapshot.refundRate * 100)}%.`);
    }

    const recommendation = score >= BADGE_THRESHOLDS.analysisApproveScore && risks.length === 0
        ? 'approve'
        : score >= BADGE_THRESHOLDS.analysisReviewScore
            ? 'review'
            : 'reject';

    return {
        score,
        positives,
        risks,
        recommendation
    };
};

const getNegativeReviewCount = async (shopId) => {
    const reviews = await Review.find({ shop_id: shopId })
        .select('comment rating')
        .sort({ createdAt: -1 })
        .limit(250)
        .lean();

    return reviews.filter(review => {
        const text = String(review.comment || '').toLowerCase();
        return review.rating <= 2 || NEGATIVE_KEYWORDS.some(keyword => text.includes(keyword));
    }).length;
};

const notifySuperAdmins = async ({ shopId, title, message, entityId, severity = 'info', metadata = {} }) => {
    const superAdmins = await User.find({ role: 'SuperAdmin', status: 'Active' }).select('_id').lean();
    if (superAdmins.length === 0) return [];
    return createNotification({
        shop_id: shopId,
        recipientUserIds: superAdmins.map(user => user._id),
        type: 'system',
        title,
        message,
        entityType: 'BadgeApplication',
        entityId,
        severity,
        metadata
    });
};

const processBadgeAnalysisJob = async (job) => {
    const applicationId = job.payload?.applicationId;
    const application = await BadgeApplication.findById(applicationId);
    if (!application) throw new Error('Badge application not found');

    application.status = 'analyzing';
    await application.save();

    await createNotification({
        shop_id: application.shopId,
        type: 'system',
        title: 'Badge analysis started',
        message: 'We started reviewing your store for the Trusted Seller badge.',
        entityType: 'BadgeApplication',
        entityId: application._id,
        severity: 'info'
    });

    const { snapshot } = await getEligibilitySnapshot(application.shopId);
    const [negativeReviewCount, seriousAbuseReports] = await Promise.all([
        getNegativeReviewCount(application.shopId),
        AbuseReport.countDocuments({
            shop_id: application.shopId,
            status: { $in: ['Open', 'Reviewing'] },
            reason: { $regex: 'fraud|scam|abuse|counterfeit|fake', $options: 'i' }
        })
    ]);

    const scored = scoreSnapshot(snapshot, negativeReviewCount + seriousAbuseReports);
    const analysisSummary = `Store scored ${scored.score}/100. Recommendation: ${scored.recommendation}.`;

    application.eligibilitySnapshot = snapshot;
    application.analysisScore = scored.score;
    application.analysisSummary = analysisSummary;
    application.analysisFindings = {
        positives: scored.positives,
        risks: scored.risks,
        vendorSummary: scored.risks.length
            ? 'Your store needs Super Admin review before a badge can be approved.'
            : 'Your store analysis is complete and ready for Super Admin review.'
    };
    application.recommendation = scored.recommendation;
    application.status = 'pending_super_admin_review';
    await application.save();

    await createNotification({
        shop_id: application.shopId,
        type: 'system',
        title: 'Badge analysis complete',
        message: 'Your Trusted Seller badge request is awaiting Super Admin review.',
        entityType: 'BadgeApplication',
        entityId: application._id,
        severity: 'info',
        metadata: { score: scored.score, recommendation: scored.recommendation }
    });

    await notifySuperAdmins({
        shopId: application.shopId,
        title: 'Badge request ready for review',
        message: 'A Trusted Seller badge application has completed analysis and needs Super Admin review.',
        entityId: application._id,
        severity: scored.recommendation === 'reject' ? 'warning' : 'info',
        metadata: { score: scored.score, recommendation: scored.recommendation }
    });
};

const markBadgeAnalysisFailed = async (job, error) => {
    const applicationId = job.payload?.applicationId;
    if (!applicationId) return;

    const application = await BadgeApplication.findById(applicationId);
    if (!application) return;

    application.status = 'pending_analysis';
    application.analysisSummary = `Analysis failed: ${String(error?.message || error).slice(0, 500)}`;
    await application.save();

    await notifySuperAdmins({
        shopId: application.shopId,
        title: 'Badge analysis failed',
        message: application.analysisSummary,
        entityId: application._id,
        severity: 'warning'
    });
};

const getBadgeJobStatus = async (application) => {
    if (!application?.analysisJobId) return null;
    return Job.findById(application.analysisJobId).select('status attempts lastError createdAt updatedAt').lean();
};

module.exports = {
    scoreSnapshot,
    processBadgeAnalysisJob,
    markBadgeAnalysisFailed,
    getBadgeJobStatus,
    notifySuperAdmins
};
