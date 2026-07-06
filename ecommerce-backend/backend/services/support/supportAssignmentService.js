const SupportTicket = require('../../models/SupportTicket');
const SupportStaffProfile = require('../../models/SupportStaffProfile');
const SupportAssignmentHistory = require('../../models/SupportAssignmentHistory');
const User = require('../../models/User');
const {
    ACTIVE_CAPACITY_STATUSES,
    PRIORITY_WEIGHT
} = require('./supportConstants');

const ROLE_SUITABILITY = Object.freeze({
    SupportLead: 0,
    TechnicalSupport: 1,
    SupportAgent: 2
});

const countActiveTicketsForStaff = async (staffUserId) => (
    SupportTicket.countDocuments({
        assignedTo: staffUserId,
        status: { $in: ACTIVE_CAPACITY_STATUSES },
        isDeleted: false
    })
);

const isWithinWorkingHours = (profile) => {
    const schedule = profile?.workingHours?.schedule;
    if (!Array.isArray(schedule) || schedule.length === 0) return true;

    const now = new Date();
    const day = now.getDay();
    const row = schedule.find(item => item.enabled !== false && Number(item.day) === day);
    if (!row) return false;

    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return current >= String(row.start || '00:00') && current <= String(row.end || '23:59');
};

const getCandidateProfiles = async ({ category, priority }) => {
    const profiles = await SupportStaffProfile.find({
        isActive: true,
        autoAssignmentEnabled: true,
        manualStatus: 'available'
    }).populate('userId', 'fullName email role status').lean();

    const enriched = [];
    for (const profile of profiles) {
        const user = profile.userId;
        if (!user || user.status !== 'Active') continue;
        if (priority === 'critical' && !['SupportLead', 'TechnicalSupport'].includes(profile.supportRole)) continue;
        if (!isWithinWorkingHours(profile)) continue;

        const skills = Array.isArray(profile.skills) ? profile.skills : [];
        const exactSkill = skills.includes(category);
        const generalSkill = skills.includes('general_support');
        if (!exactSkill && !generalSkill) continue;

        const activeCount = await countActiveTicketsForStaff(user._id);
        const max = Number(profile.maximumActiveTickets || 1);
        if (activeCount >= max) continue;

        enriched.push({
            ...profile,
            user,
            activeCount,
            workloadRatio: activeCount / max,
            exactSkill
        });
    }

    return enriched.sort((a, b) => {
        if (a.exactSkill !== b.exactSkill) return a.exactSkill ? -1 : 1;
        const roleDelta = (ROLE_SUITABILITY[a.supportRole] ?? 9) - (ROLE_SUITABILITY[b.supportRole] ?? 9);
        if (roleDelta !== 0) return roleDelta;
        if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
        if (a.workloadRatio !== b.workloadRatio) return a.workloadRatio - b.workloadRatio;
        const aAssigned = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
        const bAssigned = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
        if (aAssigned !== bAssigned) return aAssigned - bAssigned;
        return String(a.user._id).localeCompare(String(b.user._id));
    });
};

const getQueueSort = () => ({
    priority: 1,
    createdAt: 1
});

const setPriorityRank = (ticket) => PRIORITY_WEIGHT[ticket.priority] ?? 2;

const assignTicketToStaff = async ({
    ticket,
    staffUserId,
    assignedBy = null,
    assignmentType = 'manual',
    reason = '',
    allowCapacityOverride = false
}) => {
    const profile = await SupportStaffProfile.findOne({
        userId: staffUserId,
        isActive: true
    }).populate('userId', 'status role fullName email');

    if (!profile || profile.userId?.status !== 'Active') {
        const err = new Error('Support staff is not active.');
        err.status = 400;
        throw err;
    }

    const activeCount = await countActiveTicketsForStaff(staffUserId);
    if (!allowCapacityOverride && activeCount >= Number(profile.maximumActiveTickets || 1)) {
        const err = new Error('Support staff is already at capacity.');
        err.status = 400;
        throw err;
    }

    const previousStaffId = ticket.assignedTo || null;
    ticket.assignedTo = staffUserId;
    ticket.assignedAt = new Date();
    ticket.assignmentType = assignmentType;
    ticket.assignmentFailureReason = '';
    ticket.status = ticket.status === 'reopened' ? 'reopened' : 'assigned';
    await ticket.save();

    profile.lastAssignedAt = new Date();
    await profile.save();

    await SupportAssignmentHistory.create({
        ticketId: ticket._id,
        fromStaffId: previousStaffId,
        toStaffId: staffUserId,
        assignedBy,
        assignmentType,
        reason
    });

    return ticket;
};

const autoAssignTicket = async (ticket, { assignedBy = null, reason = 'Automatic assignment' } = {}) => {
    const candidates = await getCandidateProfiles({
        category: ticket.category,
        priority: ticket.priority
    });

    if (candidates.length === 0) {
        ticket.status = 'unassigned';
        ticket.assignmentFailureReason = ticket.priority === 'critical'
            ? 'CRITICAL_REQUIRES_ESCALATION'
            : 'NO_ACTIVE_AGENT';
        ticket.assignedTo = null;
        await ticket.save();
        return { assigned: false, ticket, reason: ticket.assignmentFailureReason };
    }

    const candidate = candidates[0];
    await assignTicketToStaff({
        ticket,
        staffUserId: candidate.user._id,
        assignedBy,
        assignmentType: 'automatic',
        reason
    });

    return { assigned: true, ticket, staff: candidate.user };
};

const assignNextFromQueue = async () => {
    const tickets = await SupportTicket.find({
        status: 'unassigned',
        assignedTo: null,
        isDeleted: false
    }).sort({ createdAt: 1 }).limit(25);

    tickets.sort((a, b) => {
        const priorityDelta = setPriorityRank(a) - setPriorityRank(b);
        if (priorityDelta !== 0) return priorityDelta;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    for (const ticket of tickets) {
        const result = await autoAssignTicket(ticket, { reason: 'Queue assignment' });
        if (result.assigned) return result;
    }

    return { assigned: false };
};

const getStaffWorkload = async (profile) => {
    const activeTicketCount = await countActiveTicketsForStaff(profile.userId?._id || profile.userId);
    const maximumActiveTickets = Number(profile.maximumActiveTickets || 1);
    return {
        activeTicketCount,
        maximumActiveTickets,
        calculatedStatus: profile.isActive === false
            ? 'inactive'
            : (activeTicketCount >= maximumActiveTickets ? 'busy' : profile.manualStatus || 'available')
    };
};

module.exports = {
    countActiveTicketsForStaff,
    getCandidateProfiles,
    assignTicketToStaff,
    autoAssignTicket,
    assignNextFromQueue,
    getStaffWorkload
};
