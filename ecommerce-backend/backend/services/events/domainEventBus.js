const crypto = require('crypto');

const subscriptions = new Map();

const normalizeTypes = (eventTypes) => Array.isArray(eventTypes) ? eventTypes : [eventTypes];

const subscribe = ({ eventTypes = '*', name, handler, priority = 100 }) => {
    if (!name || typeof handler !== 'function') throw new Error('Domain event subscriber requires a name and handler.');
    for (const eventType of normalizeTypes(eventTypes)) {
        const listeners = subscriptions.get(eventType) || [];
        if (!listeners.some(listener => listener.name === name)) {
            listeners.push({ name, handler, priority: Number(priority) || 100 });
            listeners.sort((left, right) => left.priority - right.priority);
            subscriptions.set(eventType, listeners);
        }
    }
};

const buildDomainEvent = (type, payload = {}) => ({
    eventId: payload.eventId || crypto.randomUUID(),
    correlationId: payload.correlationId || crypto.randomUUID(),
    occurredAt: payload.occurredAt || new Date(),
    ...payload,
    type
});

const publish = async (event, { throwOnError = false } = {}) => {
    if (!event?.type) throw new Error('Domain event type is required.');
    const listeners = [
        ...(subscriptions.get(event.type) || []),
        ...(subscriptions.get('*') || [])
    ].sort((left, right) => left.priority - right.priority);
    const results = {};
    const errors = [];

    for (const listener of listeners) {
        try {
            results[listener.name] = await listener.handler(event);
        } catch (error) {
            errors.push({ subscriber: listener.name, error });
            console.error('[DomainEventBus] Subscriber failed:', listener.name, event.type, error.message);
            if (throwOnError) throw error;
        }
    }

    return { event, results, errors };
};

const clearSubscribersForTests = () => {
    if (process.env.NODE_ENV !== 'test') throw new Error('Subscribers can only be reset in tests.');
    subscriptions.clear();
};

module.exports = {
    subscribe,
    publish,
    buildDomainEvent,
    clearSubscribersForTests
};
