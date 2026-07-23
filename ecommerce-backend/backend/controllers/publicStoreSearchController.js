const { searchPublicStores } = require('../services/search/storeSearchService');

exports.searchStores = async (req, res) => {
    try {
        const query = String(req.query.q || '').trim().slice(0, 80);
        if (query.length < 2) {
            return res.status(200).json({ success: true, data: [], query });
        }
        const stores = await searchPublicStores({ query, limit: req.query.limit });
        return res.status(200).json({ success: true, data: stores, query });
    } catch (error) {
        console.error('Public store search failed:', error.message);
        return res.status(500).json({ success: false, code: 'STORE_SEARCH_FAILED', message: 'Store search is temporarily unavailable.' });
    }
};
