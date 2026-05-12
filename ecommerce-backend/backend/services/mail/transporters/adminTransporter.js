const nodemailer = require('nodemailer');

const adminTransporter = nodemailer.createTransport({
    host: 'mail.spacemail.com',
    port: 465,
    secure: true,

    auth: {
        user: process.env.ADMIN_EMAIL_USER,
        pass: process.env.ADMIN_EMAIL_PASS
    }
});

module.exports = adminTransporter;