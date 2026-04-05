import { Request, Response, NextFunction } from 'express';
import { RecipesService } from './recipes.service';
import { ApiResponse } from '../../../shared/utils/api-response';

const recipesService = new RecipesService();

export class RecipesController {
  async findByProducto(req: Request, res: Response, next: NextFunction) {
    try {
      const receta = await recipesService.findByProducto(req.params.productoId);
      return ApiResponse.ok(res, receta);
    } catch (err: any) {
      if (err.message === 'Receta no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async createOrUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const receta = await recipesService.createOrUpdate(req.body);
      return ApiResponse.created(res, receta, 'Receta guardada exitosamente');
    } catch (err: any) {
      if (err.message === 'Producto no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async calculateCost(req: Request, res: Response, next: NextFunction) {
    try {
      const costo = await recipesService.calculateCost(req.params.id);
      return ApiResponse.ok(res, { costoCalculado: costo }, 'Costo recalculado');
    } catch (err: any) {
      if (err.message === 'Receta no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await recipesService.delete(req.params.id);
      return ApiResponse.ok(res, null, 'Receta eliminada');
    } catch (err: any) {
      if (err.message === 'Receta no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
