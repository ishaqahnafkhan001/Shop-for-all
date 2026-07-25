const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSafeSearchRegex = (value, maxLength = 80) => {
    const normalized = String(value || '').trim().slice(0, maxLength);
    return normalized ? new RegExp(escapeRegex(normalized), 'i') : null;
};

const getPagination = (query = {}, defaultLimit = DEFAULT_PAGE_SIZE) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Number.parseInt(query.limit || query.pageSize, 10) || defaultLimit)
    );
    return { page, limit, skip: (page - 1) * limit };
};

const buildPagination = ({ page, limit, total }) => {
    const totalItems = Math.max(0, Number(total) || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
        page,
        pageSize: limit,
        limit,
        totalItems,
        total: totalItems,
        totalPages,
        pages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
};

const getAllowlistedSort = ({
    query = {},
    map,
    fallback = 'newest'
}) => {
    const key = String(query.sort || query.sortBy || fallback);
    const sort = map[key] || map[fallback];
    return { ...sort, _id: sort?._id || sort?.createdAt || -1 };
};

const addDateRange = (filter, query = {}, field = 'createdAt') => {
    const range = {};
    const from = query.dateFrom ? new Date(query.dateFrom) : null;
    const to = query.dateTo ? new Date(query.dateTo) : null;
    if (from && !Number.isNaN(from.getTime())) range.$gte = from;
    if (to && !Number.isNaN(to.getTime())) range.$lte = to;
    if (Object.keys(range).length) filter[field] = range;
    return filter;
};

module.exports = {
    addDateRange,
    buildPagination,
    escapeRegex,
    getAllowlistedSort,
    getPagination,
    getSafeSearchRegex
};
