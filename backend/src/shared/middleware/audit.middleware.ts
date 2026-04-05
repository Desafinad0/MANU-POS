import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import logger from '../utils/logger';

export async function logAction(
  usuarioId: string,
  accion: string,
  entidad: string,
  entidadId?: string,
  datosAntes?: any,
  datosDespues?: any,
  ip?: string
) {
  try {
    await prisma.bitacoraAccion.create({
      data: {
        usuarioId,
        accion,
        entidad,
        entidadId,
        datosAntes,
        datosDespues,
        ip,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error al registrar acción en bitácora');
  }
}

export function auditAction(accion: string, entidad: string) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Audit logging is done at the service level for more control
    next();
  };
}
