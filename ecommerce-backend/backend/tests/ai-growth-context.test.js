const test = require('node:test');
const assert = require('node:assert/strict');
const { getGrowthInterval, productTopics, normalizeTopic } = require('../services/ai/growthAiContext');
test('7, 30 and 90 day evidence windows are exact and frozen; malformed/future/stale intervals are rejected', () => {
    const now = Date.now();
    for (const range of [7, 30, 90]) {
        const interval = getGrowthInterval(range, undefined, now);
        assert.equal(+interval.to - +interval.from, range * 86400000);
        assert.deepEqual(getGrowthInterval(range, JSON.parse(JSON.stringify(interval)), now + 1000), interval);
        assert.throws(() => getGrowthInterval(range, { from: interval.from, to: new Date(now + 2000) }, now));
        assert.throws(() => getGrowthInterval(range, interval, now + 2 * 86400000));
    }
    assert.throws(() => getGrowthInterval(7, { from: 'invalid', to: 'invalid' }, now));
});
test('only canonical taxonomy topics enter Growth context; Bangla marks survive normalization', () => {
    const topics = productTopics({ category: 'পোশাক', tags: ['person@example.com', '01711111111', 'secret address', 'skincare'] });
    assert.deepEqual([...topics], ['Clothing', 'Beauty']);
    assert.equal(normalizeTopic('পোশাক'), 'পোশাক');
});
