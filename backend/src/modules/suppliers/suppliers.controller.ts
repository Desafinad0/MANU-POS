import { Request, Response, NextFunction } from 'express';
import { SuppliersService } from './suppliers.service';
import { ApiResponse } from '../../shared/utils/api-response';
import { parsePagination } from '../../shared/utils/pagination';

const suppliersService = new SuppliersService();

export class SuppliersController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const search = req.query.search as string | undefined;
      const result = await suppliersService.findAll(page, limit, search);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const proveedor = await suppliersService.findById(req.params.id);
      return ApiResponse.ok(res, proveedor);
    } catch (err: any) {
      if (err.message === 'Proveedor no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const proveedor = await suppliersService.create(req.body);
      return ApiResponse.created(res, proveedor, 'Proveedor creado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const proveedor = await suppliersService.update(req.params.id, req.body);
      return ApiResponse.ok(res, proveedor, 'Proveedor actualizado');
    } catch (err: any) {
      if (err.message === 'Proveedor no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await suppliersService.delete(req.params.id);
      return ApiResponse.ok(res, null, 'Proveedor eliminado');
    } catch (err: any) {
      if (err.message === 'Proveedor no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
