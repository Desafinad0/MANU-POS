import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { appConfig, allowedOrigins } from './config/app';
import { errorHandler } from './shared/middleware/error-handler.middleware';
import logger from './shared/utils/logger';
import routes from './routes';

const seedPrisma = new PrismaClient();

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

// Temporary seed endpoint — remove after first run
app.post('/api/seed', async (req, res) => {
  if (req.headers['x-seed-key'] !== 'manu-seed-2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const adminRole = await seedPrisma.rol.upsert({
      where: { nombre: 'admin' }, update: {},
      create: { nombre: 'admin', descripcion: 'Administrador con acceso total', permisos: ['VENTAS_CREAR','VENTAS_CANCELAR','VENTAS_VER','PRODUCTOS_CREAR','PRODUCTOS_EDITAR','PRODUCTOS_ELIMINAR','RECETAS_GESTIONAR','INVENTARIO_VER','INVENTARIO_ENTRADAS','INVENTARIO_AJUSTES','INVENTARIO_TRANSFERENCIAS','CAJA_ABRIR','CAJA_CERRAR','CAJA_VER_TODAS','USUARIOS_GESTIONAR','ROLES_GESTIONAR','REPORTES_VER','DESCUENTOS_APLICAR'] },
    });
    await seedPrisma.rol.upsert({ where: { nombre: 'supervisor' }, update: {}, create: { nombre: 'supervisor', descripcion: 'Supervisor', permisos: ['VENTAS_CREAR','VENTAS_CANCELAR','VENTAS_VER','PRODUCTOS_CREAR','PRODUCTOS_EDITAR','CAJA_ABRIR','CAJA_CERRAR','REPORTES_VER','DESCUENTOS_APLICAR'] } });
    await seedPrisma.rol.upsert({ where: { nombre: 'cajero' }, update: {}, create: { nombre: 'cajero', descripcion: 'Cajero', permisos: ['VENTAS_CREAR','VENTAS_VER','CAJA_ABRIR','CAJA_CERRAR','INVENTARIO_VER'] } });
    await seedPrisma.rol.upsert({ where: { nombre: 'cocina' }, update: {}, create: { nombre: 'cocina', descripcion: 'Cocina', permisos: ['VENTAS_VER'] } });
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await seedPrisma.usuario.upsert({
      where: { username: 'admin' }, update: {},
      create: { username: 'admin', email: 'admin@manuaguachiles.com', passwordHash, nombre: 'Administrador', apellido: 'Sistema', pin: '0000', roles: { create: { rolId: adminRole.id } } },
    });
    const almacenesCount = await seedPrisma.almacen.count();
    if (almacenesCount === 0) await seedPrisma.almacen.createMany({ data: [{ nombre: 'Cocina', descripcion: 'Almacén de cocina' }, { nombre: 'Barra', descripcion: 'Almacén de barra' }, { nombre: 'Almacén Seco', descripcion: 'Almacén seco' }] });
    const categoriasCount = await seedPrisma.categoria.count();
    if (categoriasCount === 0) await seedPrisma.categoria.createMany({ data: [{ nombre: 'Aguachiles', descripcion: 'Aguachiles frescos', orden: 1 }, { nombre: 'Ceviches', descripcion: 'Ceviches y tostadas', orden: 2 }, { nombre: 'Cocteles', descripcion: 'Cocteles de mariscos', orden: 3 }, { nombre: 'Bebidas', descripcion: 'Bebidas y refrescos', orden: 4 }, { nombre: 'Extras', descripcion: 'Extras y complementos', orden: 5 }] });
    res.json({ ok: true, message: 'Seed ejecutado correctamente' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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
