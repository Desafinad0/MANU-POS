import { Request, Response, NextFunction } from 'express';
import { SuppliesService } from './supplies.service';
import { ApiResponse } from '../../../shared/utils/api-response';
import { parsePagination } from '../../../shared/utils/pagination';

const suppliesService = new SuppliesService();

export class SuppliesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const search = req.query.search as string | undefined;
      const result = await suppliesService.findAll(page, limit, search);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const insumo = await suppliesService.findById(req.params.id);
      return ApiResponse.ok(res, insumo);
    } catch (err: any) {
      if (err.message === 'Insumo no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const insumo = await suppliesService.create(req.body);
      return ApiResponse.created(res, insumo);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const insumo = await suppliesService.update(req.params.id, req.body);
      return ApiResponse.ok(res, insumo, 'Insumo actualizado');
    } catch (err: any) {
      if (err.message === 'Insumo no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await suppliesService.delete(req.params.id);
      return ApiResponse.ok(res, null, 'Insumo desactivado');
    } catch (err: any) {
      if (err.message === 'Insumo no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
