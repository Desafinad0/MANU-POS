import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/api-response';

export function requirePermission(...permisos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const hasPermission = permisos.some((p) => req.user!.permisos.includes(p));
    if (!hasPermission) {
      return ApiResponse.forbidden(res, `Permiso requerido: ${permisos.join(' o ')}`);
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const hasRole = roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      return ApiResponse.forbidden(res, `Rol requerido: ${roles.join(' o ')}`);
    }

    next();
  };
}

// All available permissions
export const PERMISOS = {
  VENTAS_CREAR: 'VENTAS_CREAR',
  VENTAS_CANCELAR: 'VENTAS_CANCELAR',
  VENTAS_VER: 'VENTAS_VER',
  PRODUCTOS_CREAR: 'PRODUCTOS_CREAR',
  PRODUCTOS_EDITAR: 'PRODUCTOS_EDITAR',
  PRODUCTOS_ELIMINAR: 'PRODUCTOS_ELIMINAR',
  RECETAS_GESTIONAR: 'RECETAS_GESTIONAR',
  INVENTARIO_VER: 'INVENTARIO_VER',
  INVENTARIO_ENTRADAS: 'INVENTARIO_ENTRADAS',
  INVENTARIO_AJUSTES: 'INVENTARIO_AJUSTES',
  INVENTARIO_TRANSFERENCIAS: 'INVENTARIO_TRANSFERENCIAS',
  CAJA_ABRIR: 'CAJA_ABRIR',
  CAJA_CERRAR: 'CAJA_CERRAR',
  CAJA_VER_TODAS: 'CAJA_VER_TODAS',
  USUARIOS_GESTIONAR: 'USUARIOS_GESTIONAR',
  ROLES_GESTIONAR: 'ROLES_GESTIONAR',
  REPORTES_VER: 'REPORTES_VER',
  DESCUENTOS_APLICAR: 'DESCUENTOS_APLICAR',
  ORDENES_CREAR: 'ORDENES_CREAR',
  ORDENES_VER: 'ORDENES_VER',
  ORDENES_CANCELAR: 'ORDENES_CANCELAR',
  MESAS_GESTIONAR: 'MESAS_GESTIONAR',
} as const;
