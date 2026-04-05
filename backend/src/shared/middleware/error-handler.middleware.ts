import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';
import { ApiResponse } from '../utils/api-response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, 'Error no manejado');

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(e.message);
    });
    return ApiResponse.badRequest(res, 'Error de validación', errors);
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      return ApiResponse.conflict(res, `El valor ya existe: ${prismaErr.meta?.target?.join(', ')}`);
    }
    if (prismaErr.code === 'P2025') {
      return ApiResponse.notFound(res, 'Registro no encontrado');
    }
  }

  return ApiResponse.error(
    res,
    process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  );
}
