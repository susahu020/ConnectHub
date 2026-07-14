import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Heal null array values in PostgreSQL
prisma.$executeRawUnsafe(`UPDATE "Message" SET "isDeletedFor" = '{}' WHERE "isDeletedFor" IS NULL`)
  .then(() => console.log('Database healed: isDeletedFor null arrays initialized.'))
  .catch((err) => console.error('Database healing failed:', err));

export default prisma;
