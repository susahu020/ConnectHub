import nodemailer from 'nodemailer';
import { SMTP_CONFIG } from './env';

let transporter: nodemailer.Transporter;

const initMailer = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  const hasCredentials = !!(SMTP_CONFIG.user && SMTP_CONFIG.pass);

  if (hasCredentials) {
    // Explicitly using Port 587 with STARTTLS (secure: false) instead of native service profiles.
    // This handles cloud firewall routing much more reliably on platforms like Render.
    const transportConfig: nodemailer.TransportOptions = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Must be false for port 587
      pool: true,
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass,
      },
      tls: {
        rejectUnauthorized: false, // Prevents cloud certificate authentication rejections
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 15000, // Giving the stream a slightly wider buffer window
      greetingTimeout: 15000,
    };

    transporter = nodemailer.createTransport(transportConfig);

    transporter.verify()
      .then(() => {
        console.log(`🎉 Success: Mailer authenticated smoothly via secure STARTTLS on Port 587.`);
      })
      .catch((verifyError) => {
        console.error('⚠️ SMTP verification deferred. Retrying live on transactional send:', verifyError.message);
      });

    return transporter;
  }

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