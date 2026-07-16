import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

const initMailer = async () => {
  if (transporter) return transporter;

  const hasCredentials = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (hasCredentials) {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const isGmail = smtpHost.includes('gmail.com');

    // Configure the configuration object based on the provider
    const transportConfig = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS?.trim(), // .trim() removes any accidental copy-paste spaces
          },
        }
      : {
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '465', 10),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
          },
          connectionTimeout: 8000, // 8-second cutoff to protect request speeds
          greetingTimeout: 8000,
        };

    transporter = nodemailer.createTransport(transportConfig as any);

    // Verify connection configuration safely without blocking startup threads
    transporter.verify()
      .then(() => {
        console.log(`Mailer verified successfully via ${isGmail ? 'Gmail Service Profile' : 'Standard SMTP Host'}.`);
      })
      .catch((verifyError) => {
        console.error('SMTP Connection check failed. Will attempt sending but keeping logs available:', verifyError.message);
      });

    return transporter;
  }

  // 🛡️ FALLBACK: If no credentials are found at all, create an output logger
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  console.log('⚠️ WARNING: Mailer running in CONSOLE FALLBACK mode. Emails will print to Render logs.');
  
  return transporter;
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  const mailTransporter = await initMailer();
  
  try {
    const info = await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || '"ConnectHub" <noreply@connecthub.com>',
      to,
      subject,
      text,
      html,
    });

    // Check if it fell back to jsonTransport, print logs explicitly
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
  } catch (error: any) {
    console.error('Nodemailer runtime error encountered during transmission:', error.message);
    
    // Emergency Log to console if the transmission pipeline breaks mid-request
    console.log('================= ✉️ EMERGENCY CONSOLE FALLBACK =================');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY: ${text}`);
    console.log('================================================================');
    
    return { messageId: 'fallback-triggered-no-crash' };
  }
};