exports.customerMessageTemplate = ({
                                       senderName,
                                       name,
                                       email,
                                       subject,
                                       message
                                   }) => {
    const escapeHtml = (value = '') => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const safeSenderName = escapeHtml(senderName);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

    const preheaderText = message.length > 80 ? message.substring(0, 80) + '...' : message;

    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title>${safeSubject}</title>
        
    </head>
    
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        
        <!-- HIDDEN PREHEADER TEXT -->
        <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #f3f4f6;">
            ${escapeHtml(preheaderText)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
        </div>
    
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    
                    <!-- MAIN CONTENT WRAPPER -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                        
                        <!-- HEADER SECTION -->
                        <tr>
                            <td align="center" style="background-color: #4f46e5; padding: 30px 20px;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                                    ${safeSenderName}
                                </h1>
                            </td>
                        </tr>
                        
                        <!-- BODY SECTION -->
                        <tr>
                            <td style="padding: 40px 32px; color: #374151; font-size: 16px; line-height: 1.625;">
                                
                                <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #111827; font-weight: 600;">
                                    Hello ${safeName},
                                </h2>

                                <!-- 2. DISPLAYING THE SUBJECT HERE -->
                                <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Subject:</p>
                                    <p style="margin: 4px 0 0 0; font-size: 18px; color: #1f2937; font-weight: 500;">
                                        ${safeSubject}
                                    </p>
                                </div>
                                
                                <div style="margin-bottom: 32px; color: #4b5563;">${safeMessage}</div>
                                
                                <p style="margin: 0; color: #374151;">
                                    Best regards,<br/>
                                    <strong style="color: #111827;">${safeSenderName} Team</strong>
                                </p>
                                
                            </td>
                        </tr>
                        
                        <!-- FOOTER SECTION -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                                
                                <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                                    This email was sent to <a href="mailto:${safeEmail}" style="color: #4f46e5; text-decoration: none;">${safeEmail}</a> by ${safeSenderName}.<br/>
                                    If you believe you received this by mistake, please ignore it.
                                </p>
                                
                                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                    &copy; ${new Date().getFullYear()} ${safeSenderName}. All rights reserved.
                                </p>
                                
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
