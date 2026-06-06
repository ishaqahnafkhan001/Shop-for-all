const nodemailer = require('nodemailer');

const smtpPort = Number(process.env.ADMIN_SMTP_PORT || process.env.SMTP_PORT || 465);

const adminTransporter = nodemailer.createTransport({
    host: process.env.ADMIN_SMTP_HOST || process.env.SMTP_HOST || 'mail.spacemail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
        user: process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER,
        pass: process.env.ADMIN_EMAIL_PASS || process.env.EMAIL_PASS
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 15000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
    tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true',
        minVersion: 'TLSv1.2'
    }
});

module.exports = adminTransporter;
