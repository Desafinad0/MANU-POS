import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service';
import { ApiResponse } from '../../shared/utils/api-response';
import { parsePagination } from '../../shared/utils/pagination';

const salesService = new SalesService();

export class SalesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const filters = {
        fechaInicio: req.query.fechaInicio as string | undefined,
        fechaFin: req.query.fechaFin as string | undefined,
        estado: req.query.estado as string | undefined,
        tipoServicio: req.query.tipoServicio as string | undefined,
        search: req.query.search as string | undefined,
      };
      const result = await salesService.findAll(page, limit, filters);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getKitchenOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await salesService.findForKitchen();
      return ApiResponse.ok(res, orders);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const venta = await salesService.findById(req.params.id);
      return ApiResponse.ok(res, venta);
    } catch (err: any) {
      if (err.message === 'Venta no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const venta = await salesService.create(req.body, req.user!.userId);
      return ApiResponse.created(res, venta, 'Venta registrada exitosamente');
    } catch (err: any) {
      if (err.message.includes('caja abierta') || err.message.includes('no disponible')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const venta = await salesService.cancel(
        req.params.id,
        req.body.motivoCancelacion,
        req.user!.userId
      );
      return ApiResponse.ok(res, venta, 'Venta cancelada exitosamente');
    } catch (err: any) {
      if (err.message === 'Venta no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      if (err.message.includes('Solo se pueden cancelar')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const detalle = await salesService.updateItemStatus(
        req.params.id,
        req.params.itemId,
        req.body.estado
      );
      return ApiResponse.ok(res, detalle, 'Estado actualizado');
    } catch (err: any) {
      if (err.message === 'Detalle de venta no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async getDailySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const fecha = req.query.fecha ? new Date(req.query.fecha as string) : undefined;
      const summary = await salesService.getDailySummary(fecha);
      return ApiResponse.ok(res, summary);
    } catch (err) {
      next(err);
    }
  }
}
