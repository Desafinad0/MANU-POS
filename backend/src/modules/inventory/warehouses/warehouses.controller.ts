import { Request, Response, NextFunction } from 'express';
import { WarehousesService } from './warehouses.service';
import { ApiResponse } from '../../../shared/utils/api-response';

const warehousesService = new WarehousesService();

export class WarehousesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const almacenes = await warehousesService.findAll();
      return ApiResponse.ok(res, almacenes);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const almacen = await warehousesService.findById(req.params.id);
      return ApiResponse.ok(res, almacen);
    } catch (err: any) {
      if (err.message === 'Almacén no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const almacen = await warehousesService.create(req.body);
      return ApiResponse.created(res, almacen);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const almacen = await warehousesService.update(req.params.id, req.body);
      return ApiResponse.ok(res, almacen, 'Almacén actualizado');
    } catch (err: any) {
      if (err.message === 'Almacén no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
