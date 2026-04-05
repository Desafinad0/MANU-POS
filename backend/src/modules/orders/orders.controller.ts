import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service';
import { ApiResponse } from '../../shared/utils/api-response';

const ordersService = new OrdersService();

export class OrdersController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        estado: req.query.estado as string | undefined,
        tipoServicio: req.query.tipoServicio as string | undefined,
        mesaId: req.query.mesaId as string | undefined,
        incluirCerradas: req.query.incluirCerradas === 'true',
      };
      const ordenes = await ordersService.findAll(filters);
      return ApiResponse.ok(res, ordenes);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const orden = await ordersService.findById(req.params.id);
      return ApiResponse.ok(res, orden);
    } catch (err: any) {
      if (err.message === 'Orden no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orden = await ordersService.create(req.body, req.user!.userId);
      return ApiResponse.created(res, orden, 'Orden creada exitosamente');
    } catch (err: any) {
      if (
        err.message.includes('Mesa no encontrada') ||
        err.message.includes('no esta disponible') ||
        err.message.includes('no disponible') ||
        err.message.includes('Producto no encontrado')
      ) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async addItems(req: Request, res: Response, next: NextFunction) {
    try {
      const orden = await ordersService.addItems(req.params.id, req.body, req.user!.userId);
      return ApiResponse.ok(res, orden, 'Items agregados exitosamente');
    } catch (err: any) {
      if (err.message === 'Orden no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      if (
        err.message.includes('Solo se pueden agregar') ||
        err.message.includes('no disponible') ||
        err.message.includes('Producto no encontrado')
      ) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async sendToKitchen(req: Request, res: Response, next: NextFunction) {
    try {
      const orden = await ordersService.sendToKitchen(req.params.id, req.user!.userId);
      return ApiResponse.ok(res, orden, 'Orden enviada a cocina');
    } catch (err: any) {
      if (err.message === 'Orden no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      if (err.message.includes('No hay items pendientes')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const detalle = await ordersService.updateItemStatus(
        req.params.id,
        req.params.itemId,
        req.body.estado
      );
      return ApiResponse.ok(res, detalle, 'Estado actualizado');
    } catch (err: any) {
      if (err.message === 'Item de orden no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      if (err.message.includes('Transicion de estado invalida')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async getForKitchen(req: Request, res: Response, next: NextFunction) {
    try {
      const destino = req.query.destino as string | undefined;
      const ordenes = await ordersService.findForKitchen(destino);
      return ApiResponse.ok(res, ordenes);
    } catch (err) {
      next(err);
    }
  }

  async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const venta = await ordersService.pay(req.params.id, req.body, req.user!.userId);
      return ApiResponse.ok(res, venta, 'Orden cobrada exitosamente');
    } catch (err: any) {
      if (err.message === 'Orden no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      if (
        err.message.includes('caja abierta') ||
        err.message.includes('no esta lista para cobrar')
      ) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const orden = await ordersService.cancel(
        req.params.id,
        req.body.motivoCancelacion,
        req.user!.userId
      );
      return ApiResponse.ok(res, orden, 'Orden cancelada exitosamente');
    } catch (err: any) {
      if (err.message === 'Orden no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      if (err.message.includes('No se puede cancelar')) {
        return ApiResponse.badRequest(res, err.message);
      }
      next(err);
    }
  }
}
