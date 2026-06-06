let redisClient = null;
const memoryCache = new Map();

if (process.env.REDIS_URL) {
    try {
        const Redis = require('ioredis');
        redisClient = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false
        });

        redisClient.on('error', (error) => {
            console.error('Redis cache error:', error.message);
        });
    } catch (error) {
        console.error('Redis cache initialization failed:', error.message);
    }
}

const get = async (key) => {
    if (redisClient) {
        try {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Redis cache read failed:', error.message);
        }
    }

    const cached = memoryCache.get(key);
    if (!cached || cached.expiresAt <= Date.now()) {
        memoryCache.delete(key);
        return null;
    }

    return cached.value;
};

const set = async (key, value, ttlSeconds = 60) => {
    if (redisClient) {
        try {
            await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            return;
        } catch (error) {
            console.error('Redis cache write failed:', error.message);
        }
    }

    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000
    });
};

const del = async (key) => {
    if (redisClient) {
        try {
            await redisClient.del(key);
            return;
        } catch (error) {
            console.error('Redis cache delete failed:', error.message);
        }
    }

    memoryCache.delete(key);
};

const delPattern = async (pattern) => {
    if (redisClient) {
        try {
            const stream = redisClient.scanStream({ match: pattern, count: 100 });
            const pipeline = redisClient.pipeline();
            let count = 0;

            for await (const keys of stream) {
                keys.forEach((key) => {
                    pipeline.del(key);
                    count += 1;
                });
            }

            if (count > 0) await pipeline.exec();
            return;
        } catch (error) {
            console.error('Redis cache pattern delete failed:', error.message);
        }
    }

    const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    for (const key of memoryCache.keys()) {
        if (regex.test(key)) memoryCache.delete(key);
    }
};

module.exports = {
    get,
    set,
    del,
    delPattern
};
