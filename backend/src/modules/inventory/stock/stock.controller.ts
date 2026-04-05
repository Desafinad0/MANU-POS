import { Request, Response, NextFunction } from 'express';
import { StockService } from './stock.service';
import { ApiResponse } from '../../../shared/utils/api-response';
import { parsePagination } from '../../../shared/utils/pagination';

const stockService = new StockService();

export class StockController {
  async getCurrentStock(req: Request, res: Response, next: NextFunction) {
    try {
      const almacenId = req.query.almacenId as string | undefined;
      const insumoId = req.query.insumoId as string | undefined;
      const inventarios = await stockService.getCurrentStock(almacenId, insumoId);
      return ApiResponse.ok(res, inventarios);
    } catch (err) {
      next(err);
    }
  }

  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alertas = await stockService.getAlerts();
      return ApiResponse.ok(res, alertas);
    } catch (err) {
      next(err);
    }
  }

  async getKardex(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const result = await stockService.getKardex(req.params.insumoId, page, limit);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async recordMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.userId;
      const movimiento = await stockService.recordMovement(req.body, usuarioId);
      return ApiResponse.created(res, movimiento);
    } catch (err: any) {
      if (err.message?.includes('Stock insuficiente') || err.message?.includes('requerido')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async recordPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.userId;
      const result = await stockService.recordPurchase(req.body, usuarioId);
      return ApiResponse.created(res, result, `Compra ${result.folio} registrada con ${result.partidas} partidas`);
    } catch (err: any) {
      if (err.message?.includes('Stock insuficiente') || err.message?.includes('requerido')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const filters = {
        folio: req.query.folio as string | undefined,
        proveedorId: req.query.proveedorId as string | undefined,
        fechaDesde: req.query.fechaDesde as string | undefined,
        fechaHasta: req.query.fechaHasta as string | undefined,
      };
      const result = await stockService.getPurchaseOrders(filters, page, limit);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async getPurchaseOrderDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await stockService.getPurchaseOrderDetail(req.params.folio);
      return ApiResponse.ok(res, result);
    } catch (err: any) {
      if (err.message?.includes('no encontrada')) return ApiResponse.notFound(res, err.message);
      next(err);
    }
  }

  async cancelPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.userId;
      const result = await stockService.cancelPurchaseOrder(req.params.folio, usuarioId);
      return ApiResponse.ok(res, result, result.message);
    } catch (err: any) {
      if (err.message?.includes('no encontrada') || err.message?.includes('ya fue cancelada')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async transferStock(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.user!.userId;
      const result = await stockService.transferStock(req.body, usuarioId);
      return ApiResponse.created(res, result);
    } catch (err: any) {
      if (err.message?.includes('Stock insuficiente') || err.message?.includes('no pueden ser el mismo')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }
}
