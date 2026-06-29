const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nl2br = (value = '') => escapeHtml(value).replace(/\n/g, '<br/>');

const productPromotionTemplate = ({
    storeName,
    customerName,
    subject,
    message,
    product,
    productUrl
}) => {
    const price = Number(product?.pricing?.sellingPrice || 0);
    const discount = Number(product?.pricing?.discount || 0);
    const finalPrice = discount > 0 ? Math.round(price - (price * discount / 100)) : price;
    const image = Array.isArray(product?.images) ? product.images[0] : '';

    return `
<!doctype html>
<html>
<body style="margin:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:26px 28px;border-bottom:1px solid #eef2f7;">
              <div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-weight:700;">${escapeHtml(storeName)}</div>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;color:#0f172a;">${escapeHtml(subject)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155;">Hi ${escapeHtml(customerName || 'there')},</p>
              ${message ? `<p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#334155;">${nl2br(message)}</p>` : ''}
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                ${image ? `<tr><td><img src="${escapeHtml(image)}" alt="${escapeHtml(product?.title || 'Product')}" style="width:100%;max-height:320px;object-fit:cover;display:block;"/></td></tr>` : ''}
                <tr>
                  <td style="padding:22px;">
                    <h2 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#111827;">${escapeHtml(product?.title || 'Featured product')}</h2>
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#64748b;">${escapeHtml(String(product?.description || '').slice(0, 180))}</p>
                    <div style="margin-bottom:20px;">
                      <span style="font-size:22px;font-weight:800;color:#111827;">৳${finalPrice.toLocaleString('en-BD')}</span>
                      ${discount > 0 ? `<span style="margin-left:8px;font-size:14px;color:#94a3b8;text-decoration:line-through;">৳${price.toLocaleString('en-BD')}</span><span style="margin-left:8px;font-size:12px;font-weight:800;color:#047857;background:#ecfdf5;border-radius:999px;padding:4px 8px;">${discount}% OFF</span>` : ''}
                    </div>
                    <a href="${escapeHtml(productUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:800;">View Product</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #eef2f7;color:#64748b;font-size:12px;line-height:1.5;">
              You are receiving this because you purchased from or interacted with this store.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = {
    escapeHtml,
    productPromotionTemplate
};
