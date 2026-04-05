import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { ApiResponse } from '../../shared/utils/api-response';
import { parsePagination } from '../../shared/utils/pagination';

const usersService = new UsersService();

export class UsersController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const search = req.query.search as string | undefined;
      const result = await usersService.findAll(page, limit, search);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await usersService.getRoles();
      return ApiResponse.ok(res, roles);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await usersService.findById(req.params.id);
      return ApiResponse.ok(res, usuario);
    } catch (err: any) {
      if (err.message === 'Usuario no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await usersService.create(req.body);
      return ApiResponse.created(res, usuario);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await usersService.update(req.params.id, req.body);
      return ApiResponse.ok(res, usuario, 'Usuario actualizado');
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.changePassword(req.params.id, req.body.newPassword);
      return ApiResponse.ok(res, null, 'Contraseña actualizada');
    } catch (err) {
      next(err);
    }
  }

  async assignRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await usersService.assignRoles(req.params.id, req.body.roleIds);
      return ApiResponse.ok(res, usuario, 'Roles asignados');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.delete(req.params.id);
      return ApiResponse.ok(res, null, 'Usuario desactivado');
    } catch (err) {
      next(err);
    }
  }
}
