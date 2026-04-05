import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/utils/api-response';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      return ApiResponse.ok(res, result, 'Inicio de sesión exitoso');
    } catch (err: any) {
      if (err.message === 'Credenciales inválidas') {
        return ApiResponse.unauthorized(res, err.message);
      }
      next(err);
    }
  }

  async loginWithPin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.loginWithPin(req.body);
      return ApiResponse.ok(res, result, 'Inicio de sesión exitoso');
    } catch (err: any) {
      if (err.message === 'PIN inválido') {
        return ApiResponse.unauthorized(res, err.message);
      }
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      return ApiResponse.ok(res, profile);
    } catch (err) {
      next(err);
    }
  }
}
