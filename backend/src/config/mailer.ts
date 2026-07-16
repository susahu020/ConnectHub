import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

const initMailer = async () => {
  if (transporter) return transporter;

  const hasCredentials = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (hasCredentials) {
    const portNumber = parseInt(process.env.SMTP_PORT || '465', 10);
    
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: portNumber,
      secure: portNumber === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 5000, // ⏱️ Fail fast! Only wait 5 seconds before giving up
      greetingTimeout: 5000,
    });

    // Verify connection configuration immediately
    try {
      await transporter.verify();
      console.log(`Mailer verified successfully. Production SMTP: ${process.env.SMTP_HOST}:${portNumber}`);
      return transporter;
    } catch (verifyError) {
      console.error('SMTP Verification Failed. falling back to console logging:', verifyError);
    }
  }

  // 🛡️ FALLBACK: If SMTP times out or credentials fail, print to console instead of hanging
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  console.log('⚠️ WARNING: Mailer running in CONSOLE FALLBACK mode. Emails will print to Render logs.');
  
  return transporter;
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  const mailTransporter = await initMailer();
  const info = await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || '"ConnectHub" <noreply@connecthub.com>',
    to,
    subject,
    text,
    html,
  });

  // If using console/json transport fallback, print the output clearly
  if ('message' in info) {
    console.log('================= ✉️ OUTGOING EMAIL =================');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY: ${text}`);
    console.log('====================================================');
  }

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Email sent. Preview URL: ${previewUrl}`);
  }
  return info;
};