const buildPagination = ({ total = 0, page = 1, limit = 25 }) => {
    const safeTotal = Math.max(Number(total) || 0, 0);
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 1, 1);
    const totalPages = Math.max(Math.ceil(safeTotal / safeLimit), 1);

    return {
        page: safePage,
        limit: safeLimit,
        totalItems: safeTotal,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
        // Temporary compatibility aliases for existing frontend/admin code.
        total: safeTotal,
        pages: totalPages
    };
};

module.exports = {
    buildPagination
};
