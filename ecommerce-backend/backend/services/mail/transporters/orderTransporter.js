const nodemailer = require('nodemailer');

const orderTransporter = nodemailer.createTransport({
    host: 'mail.spacemail.com',
    port: 465,
    secure: true,

    auth: {
        user: process.env.ORDER_MAIL,
        pass: process.env.ORDER_MAIL_PASS,
    },

    tls: {
        rejectUnauthorized: false
    }
});

module.exports = orderTransporter;