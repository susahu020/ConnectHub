import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import fs from 'fs';

// Routes & Services
import apiRoutes from './routes/api.routes';
import { initSocket } from './services/socket.service';
import { errorHandler } from './middleware/error.middleware';
import { securityHeaders } from './middleware/securityHeaders';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

import prisma from './config/db';

// Reset all user statuses to OFFLINE on server startup
prisma.user.updateMany({
  where: {
    status: {
      not: 'OFFLINE',
    },
  },
  data: {
    status: 'OFFLINE',
  },
})
  .then((res) => {
    console.log(`Reset ${res.count} active user presence statuses to OFFLINE on startup.`);
    
    // Ensure Employee role has Groups:Create permission
    prisma.customRole.findFirst({ where: { name: 'Employee' } })
      .then((empRole) => {
        if (empRole) {
          prisma.customPermission.upsert({
            where: {
              roleId_module_action: {
                roleId: empRole.id,
                module: 'Groups',
                action: 'Create',
              }
            },
            update: { isEnabled: true },
            create: {
              roleId: empRole.id,
              module: 'Groups',
              action: 'Create',
              isEnabled: true,
            }
          }).then(() => {
            console.log('Ensured Employee role has Groups:Create permission.');
          }).catch((err) => {
            console.error('Failed to upsert Groups:Create permission for Employee:', err);
          });
        }
      });
  })
  .catch((err) => {
    console.error('Failed to reset user statuses on startup:', err);
  });

// Initialize Socket.io
const io = initSocket(server);
app.set('io', io);

// Security & Logger Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Required to view uploads in browser
  })
);
app.use(morgan('dev'));
app.use(securityHeaders);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists and serve static files from it
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/v1', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Error handling middleware
app.use(errorHandler as any);

// Listen on all network interfaces
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`ConnectHub Enterprise Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Local Static Uploads Path: ${uploadDir}`);
  console.log(`==================================================`);
});

export default server;
