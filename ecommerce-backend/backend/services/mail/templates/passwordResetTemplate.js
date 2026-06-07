const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

exports.passwordResetTemplate = ({
                                     brandName = 'ScaleUp',
                                     recipientName = 'there',
                                     email,
                                     otp,
                                     expiresInMinutes = 10,
                                     supportEmail
                                 }) => {
    const safeBrand = escapeHtml(brandName);
    const safeName = escapeHtml(recipientName);
    const safeEmail = escapeHtml(email);
    const safeSupport = escapeHtml(supportEmail || email);

    return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f7fb;">
        Use this verification code to reset your password. It expires in ${expiresInMinutes} minutes.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="padding:28px 32px;background:#0f172a;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="width:44px;height:44px;border-radius:14px;background:#2563eb;color:#ffffff;text-align:center;line-height:44px;font-weight:800;font-size:20px;">
                                            ${safeBrand.charAt(0).toUpperCase()}
                                        </div>
                                    </td>
                                    <td align="right" style="color:#cbd5e1;font-size:14px;font-weight:700;">Password reset</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 32px 28px;">
                            <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#0f172a;">Reset your password</h1>
                            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#475569;">
                                Hi ${safeName}, use the verification code below to continue resetting your password.
                            </p>

                            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:18px;padding:24px;text-align:center;margin:0 0 24px;">
                                <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#1d4ed8;font-weight:800;">Your verification code</p>
                                <div style="font-size:36px;line-height:1;font-weight:900;letter-spacing:0.3em;color:#0f172a;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;">
                                    ${otp}
                                </div>
                            </div>

                            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#475569;">
                                This code expires in <strong>${expiresInMinutes} minutes</strong> and can be used only once.
                            </p>

                            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px 18px;margin:0 0 24px;">
                                <p style="margin:0;font-size:14px;line-height:1.6;color:#9a3412;">
                                    If you did not request this reset, ignore this email. Your password will not change unless this code is verified.
                                </p>
                            </div>

                            <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">
                                Need help? Contact support at
                                <a href="mailto:${safeSupport}" style="color:#2563eb;text-decoration:none;font-weight:700;">${safeSupport}</a>.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center;">
                            <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#64748b;">
                                This email was sent to <strong>${safeEmail}</strong>.
                            </p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${safeBrand}. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};
