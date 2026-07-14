import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

const initMailer = async () => {
  if (transporter) return transporter;

  const hasCredentials = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (hasCredentials) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Mailer configured with production SMTP settings.');
  } else {
    // Generate test SMTP service from ethereal.email
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('--------------------------------------------------');
      console.log('WARNING: SMTP credentials not set.');
      console.log(`Mailer configured with Ethereal Email test account:`);
      console.log(`User: ${testAccount.user}`);
      console.log(`Pass: ${testAccount.pass}`);
      console.log('--------------------------------------------------');
    } catch (error) {
      console.error('Failed to create Ethereal test mailer account:', error);
      // Create a dummy fallback that prints to console
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.log('Mailer configured to output emails to console.');
    }
  }

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

  // Log ethereal URL if using ethereal email
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Email sent. Preview URL: ${previewUrl}`);
  }
  return info;
};
