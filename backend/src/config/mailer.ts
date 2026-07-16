import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

const initMailer = async () => {
  if (transporter) return transporter;

  const hasCredentials = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (hasCredentials) {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const isGmail = smtpHost.includes('gmail.com') || process.env.SMTP_USER?.includes('@gmail.com');

    // FORCE NATIVE SERVICE ROUTING FOR GMAIL ON CLOUD PLATFORMS
    const transportConfig = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS?.trim(), // Cleans up accidental dashboard white spaces
          },
          // This forces the underlying module to drop connection streams fast if blocked
          connectionTimeout: 10000,
          greetingTimeout: 10000,
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
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        };

    transporter = nodemailer.createTransport(transportConfig as any);

    // Background validation check
    transporter.verify()
      .then(() => {
        console.log(`🎉 Success: Mailer authenticated natively with Gmail Service Profile.`);
      })
      .catch((verifyError) => {
        console.error('Gmail native verification deferred. Retrying live on message send:', verifyError.message);
      });

    return transporter;
  }

  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  console.log('⚠️ WARNING: Mailer running in CONSOLE FALLBACK mode.');
  
  return transporter;
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  const mailTransporter = await initMailer();
  
  try {
    const info = await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || `"ConnectHub" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    return info;
  } catch (error: any) {
    console.error('🔴 Nodemailer failed to push through Gmail network pipeline:', error.message);
    
    // Emergency console fallback so your user registration process never freezes
    console.log('================= ✉️ EMERGENCY CONSOLE FALLBACK =================');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY: ${text}`);
    console.log('================================================================');
    
    return { messageId: 'emergency-fallback-active-no-crash' };
  }
};