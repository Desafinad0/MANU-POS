import { Request, Response, NextFunction } from 'express';
import { CashRegisterService } from './cash-register.service';
import { ApiResponse } from '../../shared/utils/api-response';
import { parsePagination } from '../../shared/utils/pagination';

const cashRegisterService = new CashRegisterService();

export class CashRegisterController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const result = await cashRegisterService.findAll(page, limit);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const caja = await cashRegisterService.findById(req.params.id);
      return ApiResponse.ok(res, caja);
    } catch (err: any) {
      if (err.message === 'Caja no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async getCurrentOpen(req: Request, res: Response, next: NextFunction) {
    try {
      const caja = await cashRegisterService.getCurrentOpen(req.user!.userId);
      if (!caja) {
        return ApiResponse.ok(res, null, 'No hay caja abierta');
      }
      return ApiResponse.ok(res, caja);
    } catch (err) {
      next(err);
    }
  }

  async open(req: Request, res: Response, next: NextFunction) {
    try {
      const caja = await cashRegisterService.open(req.body.fondoInicial, req.user!.userId);
      return ApiResponse.created(res, caja, 'Caja abierta exitosamente');
    } catch (err: any) {
      if (err.message.includes('Ya tiene una caja abierta')) {
        return ApiResponse.conflict(res, err.message);
      }
      next(err);
    }
  }

  async close(req: Request, res: Response, next: NextFunction) {
    try {
      const caja = await cashRegisterService.close(
        req.params.id,
        req.body.conteoFisico,
        req.body.observaciones,
        req.user!.userId
      );
      return ApiResponse.ok(res, caja, 'Caja cerrada exitosamente');
    } catch (err: any) {
      if (err.message === 'Caja no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      if (err.message === 'La caja ya está cerrada') {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await cashRegisterService.getReport(req.params.id);
      return ApiResponse.ok(res, report);
    } catch (err: any) {
      if (err.message === 'Caja no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
