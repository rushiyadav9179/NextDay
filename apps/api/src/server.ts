import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { socketService } from './services/socketService.js';
import { registerAllAgents } from './ai/agents/allAgents.js';
import apiV1Router from './routes/apiV1.js';
import { swaggerSpec } from './routes/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

// Register all 19 AI agents
registerAllAgents();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and local development
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(generalLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'nextday-api',
  });
});

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'NextDay API Explorer',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// API v1 Routes
app.use('/api/v1', apiV1Router);

// Centralized Error Handling
app.use(errorHandler);

const PORT = env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 NextDay API server active on http://localhost:${PORT}`);
    console.log(`📖 API Documentation available at http://localhost:${PORT}/api/docs`);
    console.log(`⚡ Real-time Socket.IO gateway ready`);
  });
}

export { app, server };
