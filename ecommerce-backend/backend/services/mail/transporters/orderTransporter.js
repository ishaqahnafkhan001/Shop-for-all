const nodemailer = require('nodemailer');

const orderTransporter = nodemailer.createTransport({
    host: 'mail.spacemail.com',
    port: 587,
    secure: false, // Must be false for 587
    auth: {
        user: process.env.ORDER_MAIL,
        pass: process.env.ORDER_MAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
        // This helps if the server has certificate issues
        rejectUnauthorized: false,
        // Explicitly require TLS
        minVersion: 'TLSv1.2'
    }
});
orderTransporter.verify((error, success) => {
    if (error) {
        console.error("❌ Order Mailer Connection Error:", error);
    } else {
        console.log("✅ Order Mailer is ready to send emails");
    }
});
module.exports = orderTransporter;