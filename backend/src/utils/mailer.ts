import nodemailer from 'nodemailer';

// [LEARN] Hàm format tiền VND — nhân hệ số 1000 vì DB lưu đơn vị x1000đ
const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount * 1000);

// [LEARN] Hàm format ngày giờ theo múi giờ Việt Nam (GMT+7)
const formatVietnamTime = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(date);

export const sendReceiptEmail = async (toEmail: string, receiptData: any) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // [LEARN] Tạo HTML "rows" cho từng sản phẩm bằng .map() + .join('').
  // Kỹ thuật này gọi là "Template Strings Aggregation" — phổ biến khi render email động.
  const itemRows = (receiptData.items || []).map((item: any) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${item.product_id}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:center;">${item.color || '—'} / ${item.size || '—'}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#8FA08A;text-align:right;font-weight:bold;">${formatVND(item.price_at_purchase)}</td>
    </tr>
  `).join('');

  // [LEARN] HTML Email Template — phong cách Minimalist phù hợp thương hiệu MEKIE.
  // Gmail và Outlook render inline-style CSS tốt hơn, nên KHÔNG dùng class/stylesheet.
  const htmlBody = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F5F5F3;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F3;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- HEADER -->
        <tr>
          <td style="background:#333333;padding:36px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;font-style:italic;">MEKIE POS</div>
            <div style="font-size:11px;color:#8FA08A;letter-spacing:4px;text-transform:uppercase;margin-top:6px;">${receiptData.tenantName}</div>
          </td>
        </tr>

        <!-- TITLE -->
        <tr>
          <td style="padding:32px 40px 8px;text-align:center;">
            <div style="font-size:13px;color:#8FA08A;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">Purchase Receipt</div>
            <h1 style="margin:8px 0 0;font-size:24px;font-weight:300;color:#333;font-style:italic;">Xác nhận đơn hàng</h1>
          </td>
        </tr>

        <!-- TRANSACTION META -->
        <tr>
          <td style="padding:20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:12px;padding:20px;">
              <tr>
                <td style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:bold;padding:6px 0;">Transaction ID</td>
                <td style="font-size:14px;color:#8FA08A;font-weight:900;text-align:right;padding:6px 0;">#${receiptData.id}</td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:bold;padding:6px 0;">Khách hàng</td>
                <td style="font-size:14px;color:#333;font-weight:600;text-align:right;padding:6px 0;">${receiptData.customerName}</td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:bold;padding:6px 0;">Cửa hàng</td>
                <td style="font-size:14px;color:#333;font-weight:600;text-align:right;padding:6px 0;">${receiptData.tenantName}</td>
              </tr>
              <tr>
                <td style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:bold;padding:6px 0;">Ngày & Giờ</td>
                <td style="font-size:13px;color:#555;text-align:right;padding:6px 0;">${formatVietnamTime(receiptData.createdAt)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ITEMS TABLE -->
        <tr>
          <td style="padding:0 40px 16px;">
            <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin-bottom:12px;">Danh sách sản phẩm</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:12px;overflow:hidden;">
              <thead>
                <tr style="background:#F9FAFB;">
                  <th style="padding:10px 16px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;text-align:left;font-weight:bold;">Sản phẩm</th>
                  <th style="padding:10px 16px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;text-align:center;font-weight:bold;">SL</th>
                  <th style="padding:10px 16px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;text-align:center;font-weight:bold;">Màu / Size</th>
                  <th style="padding:10px 16px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;text-align:right;font-weight:bold;">Đơn giá</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- TOTALS -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#999;padding:6px 0;">Tạm tính (Subtotal)</td>
                <td style="font-size:13px;color:#555;text-align:right;padding:6px 0;">${formatVND(receiptData.subtotal)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#999;padding:6px 0;">Thuế VAT (10%)</td>
                <td style="font-size:13px;color:#555;text-align:right;padding:6px 0;">${formatVND(receiptData.tax)}</td>
              </tr>
              <tr style="border-top:2px solid #f0f0f0;">
                <td style="font-size:16px;color:#333;font-weight:900;padding:14px 0 6px;text-transform:uppercase;letter-spacing:1px;">Tổng cộng</td>
                <td style="font-size:22px;color:#8FA08A;font-weight:900;text-align:right;padding:14px 0 6px;">${formatVND(receiptData.total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <div style="font-size:12px;color:#999;">Cảm ơn bạn đã mua sắm tại <strong style="color:#333;">${receiptData.tenantName}</strong></div>
            <div style="font-size:11px;color:#bbb;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">Powered by MEKIE POS · SaaS Platform</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: `"${receiptData.tenantName} via MEKIE POS" <${process.env.EMAIL_FROM}>`,
    to: toEmail,
    subject: `🧾 Hóa đơn #${receiptData.id} — ${receiptData.tenantName}`,
    text: `Cảm ơn ${receiptData.customerName} đã mua hàng tại ${receiptData.tenantName}!\n\nMã đơn: #${receiptData.id}\nTổng tiền: ${formatVND(receiptData.total)}\nNgày: ${formatVietnamTime(receiptData.createdAt)}`,
    html: htmlBody,
  };

  await transporter.sendMail(mailOptions);
};
