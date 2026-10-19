const { escapeHtml } = require('./escapeHtml');

exports.baseTemplate = ({
                            senderName,
                            title,
                            recipientName,
                            content,
                            email,
                            showGreeting = true
                        }) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>

    <body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;">

        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
                <td align="center">

                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#fff;border-radius:10px;overflow:hidden;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#4f46e5;padding:24px;text-align:center;">
                                <h1 style="color:#fff;margin:0;font-size:24px;">
                                    ${escapeHtml(senderName)}
                                </h1>
                            </td>
                        </tr>

                        <!-- BODY -->
                        <tr>
                            <td style="padding:32px;color:#374151;">

                                ${showGreeting ? `<h2 style="margin-top:0;">Hello ${escapeHtml(recipientName || 'there')},</h2>` : ''}

                                <div style="white-space:pre-wrap;line-height:1.7;">
                                    ${escapeHtml(content)}
                                </div>

                                <p style="margin-top:32px;">
                                    Best regards,<br/>
                                    <strong>${escapeHtml(senderName)} Team</strong>
                                </p>

                            </td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;">

                                This email was sent to
                                <strong>${escapeHtml(email)}</strong>

                                <br/><br/>

                                © ${new Date().getFullYear()}
                                ${escapeHtml(senderName)}

                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>

    </body>
    </html>
    `;
};
