import nodemailer from 'nodemailer';

export const sendReceiptEmail = async (toEmail: string, receiptData: any) => {
  // Configured to be ready for AWS SES (or any SMTP Provider)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Your POS Purchase Receipt',
    text: `Thank you for your purchase!
    
Subtotal: $${receiptData.subtotal}
Tax: $${receiptData.tax}
Total Amount: $${receiptData.total}

Please keep this receipt.`,
  };

  await transporter.sendMail(mailOptions);
};
