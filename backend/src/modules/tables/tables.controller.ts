import { Request, Response, NextFunction } from 'express';
import { TablesService } from './tables.service';
import { ApiResponse } from '../../shared/utils/api-response';

const tablesService = new TablesService();

export class TablesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const zona = req.query.zona as string | undefined;
      const estado = req.query.estado as string | undefined;
      const activo = req.query.activo !== undefined
        ? req.query.activo === 'true'
        : undefined;

      const mesas = await tablesService.findAll({ zona, estado, activo });
      return ApiResponse.ok(res, mesas);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const mesa = await tablesService.findById(req.params.id);
      return ApiResponse.ok(res, mesa);
    } catch (err: any) {
      if (err.message === 'Mesa no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const mesa = await tablesService.create(req.body);
      return ApiResponse.created(res, mesa, 'Mesa creada exitosamente');
    } catch (err: any) {
      if (err.message === 'Ya existe una mesa con ese nombre') {
        return ApiResponse.conflict(res, err.message);
      }
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const mesa = await tablesService.update(req.params.id, req.body);
      return ApiResponse.ok(res, mesa, 'Mesa actualizada');
    } catch (err: any) {
      if (err.message === 'Mesa no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      if (err.message === 'Ya existe una mesa con ese nombre') {
        return ApiResponse.conflict(res, err.message);
      }
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await tablesService.remove(req.params.id);
      return ApiResponse.ok(res, null, 'Mesa eliminada');
    } catch (err: any) {
      if (err.message === 'Mesa no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async updateEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const { estado } = req.body;
      if (!estado || !['DISPONIBLE', 'OCUPADA', 'RESERVADA'].includes(estado)) {
        return ApiResponse.badRequest(res, 'Estado inválido');
      }
      const mesa = await tablesService.updateEstado(req.params.id, estado);
      return ApiResponse.ok(res, mesa, 'Estado de mesa actualizado');
    } catch (err: any) {
      if (err.message === 'Mesa no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
