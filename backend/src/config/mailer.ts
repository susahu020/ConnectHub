import nodemailer from 'nodemailer';
import { SMTP_CONFIG } from './env'; // Corrected path: they are in the same folder!

let transporter: nodemailer.Transporter;

const initMailer = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  const hasCredentials = !!(SMTP_CONFIG.user && SMTP_CONFIG.pass);

  if (hasCredentials) {
    const isGmail = SMTP_CONFIG.host.includes('gmail.com') || SMTP_CONFIG.user.includes('@gmail.com');

    const transportConfig: nodemailer.TransportOptions = isGmail
      ? {
          service: 'gmail',
          pool: true, // Maximizes production pipeline throughput
          auth: {
            user: SMTP_CONFIG.user,
            pass: SMTP_CONFIG.pass,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        }
      : {
          host: SMTP_CONFIG.host,
          port: SMTP_CONFIG.port,
          secure: SMTP_CONFIG.secure,
          pool: true,
          auth: {
            user: SMTP_CONFIG.user,
            pass: SMTP_CONFIG.pass,
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        };

    transporter = nodemailer.createTransport(transportConfig);

    // Defensive validation check on boot
    transporter.verify()
      .then(() => {
        console.log(`🎉 Success: Mailer authenticated smoothly via ${isGmail ? 'Gmail Native Service Profile' : 'Custom SMTP Network'}.`);
      })
      .catch((verifyError) => {
        console.error('⚠️ SMTP verification deferred. Retrying live on transactional send:', verifyError.message);
      });

    return transporter;
  }

  // Safe fallback wrapper
  transporter = nodemailer.createTransport({ jsonTransport: true });
  console.warn('⚠️ WARNING: Mailer running in CONSOLE FALLBACK mode.');
  return transporter;
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  const mailTransporter = await initMailer();
  
  try {
    const info = await mailTransporter.sendMail({
      from: SMTP_CONFIG.from,
      to,
      subject,
      text,
      html,
    });

    console.log(`✨ Email pushed successfully to ${to}. [ID: ${info.messageId}]`);
    return info;
  } catch (error: any) {
    console.error('🔴 Nodemailer failed to push through network pipeline:', error.message);
    
    // Emergency console fallback to prevent UI freezing during live user flows
    console.log('================= ✉️ EMERGENCY CONSOLE FALLBACK =================');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY: ${text}`);
    console.log('================================================================');
    
    return { messageId: 'emergency-fallback-active-no-crash' };
  }
};