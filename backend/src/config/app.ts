const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173';
export const allowedOrigins = rawOrigins.split(',').map((s) => s.trim());

export const appConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
