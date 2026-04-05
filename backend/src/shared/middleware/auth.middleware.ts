import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/jwt';
import { ApiResponse } from '../utils/api-response';

export interface JwtPayload {
  userId: string;
  username: string;
  roles: string[];
  permisos: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return ApiResponse.unauthorized(res, 'Token de acceso requerido');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return ApiResponse.unauthorized(res, 'Token inválido o expirado');
  }
}
