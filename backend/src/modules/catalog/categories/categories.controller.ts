import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service';
import { ApiResponse } from '../../../shared/utils/api-response';

const categoriesService = new CategoriesService();

export class CategoriesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categorias = await categoriesService.findAll();
      return ApiResponse.ok(res, categorias);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const categoria = await categoriesService.findById(req.params.id);
      return ApiResponse.ok(res, categoria);
    } catch (err: any) {
      if (err.message === 'Categoría no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const categoria = await categoriesService.create(req.body);
      return ApiResponse.created(res, categoria);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const categoria = await categoriesService.update(req.params.id, req.body);
      return ApiResponse.ok(res, categoria, 'Categoría actualizada');
    } catch (err: any) {
      if (err.message === 'Categoría no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const categoria = await categoriesService.updateOrder(req.params.id, req.body.orden);
      return ApiResponse.ok(res, categoria, 'Orden actualizado');
    } catch (err: any) {
      if (err.message === 'Categoría no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await categoriesService.delete(req.params.id);
      return ApiResponse.ok(res, null, 'Categoría eliminada');
    } catch (err: any) {
      if (err.message === 'Categoría no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
