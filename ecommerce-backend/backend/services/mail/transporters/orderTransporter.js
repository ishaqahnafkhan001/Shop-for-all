const nodemailer = require('nodemailer');

const smtpPort = Number(process.env.ORDER_SMTP_PORT || process.env.SMTP_PORT || 465);

const orderTransporter = nodemailer.createTransport({
    host: process.env.ORDER_SMTP_HOST || process.env.SMTP_HOST || 'mail.spacemail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
        user: process.env.ORDER_MAIL,
        pass: process.env.ORDER_MAIL_PASS,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 15000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
    tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true',
        minVersion: 'TLSv1.2'
    }
});

module.exports = orderTransporter;
