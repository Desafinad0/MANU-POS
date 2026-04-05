import express from 'express';
import cors from 'cors';
import { appConfig, allowedOrigins } from './config/app';
import { errorHandler } from './shared/middleware/error-handler.middleware';
import logger from './shared/utils/logger';
import routes from './routes';

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', routes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(appConfig.port, () => {
  logger.info(`🚀 Manu POS API corriendo en puerto ${appConfig.port}`);
  logger.info(`📋 Entorno: ${appConfig.nodeEnv}`);
});

export default app;
