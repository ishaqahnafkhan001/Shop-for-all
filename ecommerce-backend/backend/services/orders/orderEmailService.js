const { notifyNewOrder } = require('../shopEventNotificationService');

const notifyOrderCreated = ({ shop_id, order, customer }) => (
    notifyNewOrder({ shop_id, order, customer })
);

module.exports = {
    notifyOrderCreated
};
