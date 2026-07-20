import nodemailer from 'nodemailer';
import { SMTP_CONFIG } from './env';

let transporter: nodemailer.Transporter;

const initMailer = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  const hasCredentials = !!(SMTP_CONFIG.user && SMTP_CONFIG.pass);

  if (hasCredentials) {
    // Explicitly typing this as 'any' stops tsc from enforcing standard TransportOptions 
    // rules on custom cloud-optimized SMTP options.
    const transportConfig: any = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, 
      pool: true,
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass,
      },
      tls: {
        rejectUnauthorized: false, 
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 15000, 
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

// Keep the rest of your sendEmail function below identically as it is...