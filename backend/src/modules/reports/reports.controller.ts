import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { ApiResponse } from '../../shared/utils/api-response';

const reportsService = new ReportsService();

export class ReportsController {
  async ventasDiarias(req: Request, res: Response, next: NextFunction) {
    try {
      const fechaStr = req.query.fecha as string | undefined;
      const fecha = fechaStr ? new Date(fechaStr + 'T00:00:00') : undefined;
      const report = await reportsService.ventasDiarias(fecha);
      return ApiResponse.ok(res, report);
    } catch (err) {
      next(err);
    }
  }

  async corteCaja(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await reportsService.corteCaja(req.params.cajaId);
      return ApiResponse.ok(res, report);
    } catch (err: any) {
      if (err.message === 'Caja no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async stockBajo(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await reportsService.stockBajo();
      return ApiResponse.ok(res, items);
    } catch (err) {
      next(err);
    }
  }
}
