import { Queue, Worker } from 'bullmq';
import redis from '../config/redis';
import { sendEmail } from '../config/mailer';

const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';

let emailQueue: Queue | null = null;
let emailWorker: Worker | null = null;

if (isRedisAvailable) {
  try {
    emailQueue = new Queue('email-queue', {
      connection: redis as any,
    });

    emailWorker = new Worker(
      'email-queue',
      async (job) => {
        const { to, subject, text, html } = job.data;
        console.log(`[Queue Worker] Processing email task to ${to}`);
        await sendEmail(to, subject, text, html);
      },
      { connection: redis as any }
    );

    emailWorker.on('completed', (job) => {
      console.log(`[Queue Worker] Job completed: ${job.id}`);
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`[Queue Worker] Job failed: ${job?.id}. Error:`, err);
    });

    console.log('BullMQ task queues initialized successfully.');
  } catch (error) {
    console.warn('Could not initialize BullMQ queues, falling back to synchronous execution.', error);
  }
} else {
  console.log('Redis is offline. BullMQ is disabled, using synchronous mail forwarding fallback.');
}

export const queueEmail = async (to: string, subject: string, text: string, html?: string) => {
  if (emailQueue && isRedisAvailable) {
    await emailQueue.add('send-email', { to, subject, text, html });
    console.log(`[Queue Service] Queued email to ${to} in BullMQ`);
  } else {
    // Synchronous fallback
    console.log(`[Queue Service] Redis offline. Sending email synchronously to ${to}`);
    await sendEmail(to, subject, text, html).catch((e) =>
      console.error('Failed to send mail in fallback handler:', e)
    );
  }
};
