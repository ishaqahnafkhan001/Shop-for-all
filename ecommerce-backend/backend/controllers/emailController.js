const nodemailer = require('nodemailer');

exports.sendEmailToCustomer = async (req, res) => {
    try {
        // Extract shopName from the incoming request
        const { email, name, subject, message, shopName } = req.body;

        if (!email || !subject || !message) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Set a fallback name just in case it's missing
        const senderName = shopName || "Store Administration";
        // console.log("Sender Name:", senderName);
        const transporter = nodemailer.createTransport({
            host: 'mail.spacemail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.ADMIN_EMAIL_USER,
                pass: process.env.ADMIN_EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false }
        });

        const mailOptions = {
            // Display the Vendor's shop name as the sender, but use the system email
            from: `"${senderName}" <${process.env.ADMIN_EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7f6; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                            
                            <!-- Header Area -->
                            <tr>
                                <td style="background-color: #4f46e5; padding: 24px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">
                                        ${senderName}
                                    </h1>
                                </td>
                            </tr>

                            <!-- Content Area -->
                            <tr>
                                <td style="padding: 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                                    <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 18px; color: #111827; font-weight: 600;">
                                        Hello ${name},
                                    </h2>
                                    
                                    <div style="margin-bottom: 24px; white-space: pre-wrap; color: #4b5563;">${message}</div>
                                    
                                    <p style="margin-bottom: 0; color: #374151;">
                                        Best regards,<br>
                                        <strong>${senderName} Team</strong>
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer Area -->
                            <tr>
                                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                                        This email was sent to <strong>${email}</strong> by ${senderName}.<br>
                                        If you believe you received this by mistake, please ignore it.
                                    </p>
                                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
                                        &copy; ${new Date().getFullYear()} ${senderName}. All rights reserved.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>

        </body>
        </html>
    `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: "Email sent successfully" });

    } catch (error) {
        console.error("Email sending error:", error);
        res.status(500).json({ error: "Failed to send email. Please try again later." });
    }
};