import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service';
import { ApiResponse } from '../../../shared/utils/api-response';
import { parsePagination } from '../../../shared/utils/pagination';

const productsService = new ProductsService();

export class ProductsController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const search = req.query.search as string | undefined;
      const categoriaId = req.query.categoriaId as string | undefined;
      const result = await productsService.findAll(page, limit, search, categoriaId);
      return ApiResponse.paginated(res, result.data, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  }

  async findForPOS(req: Request, res: Response, next: NextFunction) {
    try {
      const categorias = await productsService.findForPOS();
      return ApiResponse.ok(res, categorias);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const producto = await productsService.findById(req.params.id);
      return ApiResponse.ok(res, producto);
    } catch (err: any) {
      if (err.message === 'Producto no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const producto = await productsService.create(req.body);
      return ApiResponse.created(res, producto);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const producto = await productsService.update(req.params.id, req.body);
      return ApiResponse.ok(res, producto, 'Producto actualizado');
    } catch (err: any) {
      if (err.message === 'Producto no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async toggleDisponibilidad(req: Request, res: Response, next: NextFunction) {
    try {
      const producto = await productsService.toggleDisponibilidad(req.params.id);
      return ApiResponse.ok(res, producto, 'Disponibilidad actualizada');
    } catch (err: any) {
      if (err.message === 'Producto no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.delete(req.params.id);
      return ApiResponse.ok(res, null, 'Producto eliminado');
    } catch (err: any) {
      if (err.message === 'Producto no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async addVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variante = await productsService.addVariant(req.params.productoId, req.body);
      return ApiResponse.created(res, variante);
    } catch (err: any) {
      if (err.message === 'Producto no encontrado') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variante = await productsService.updateVariant(req.params.id, req.body);
      return ApiResponse.ok(res, variante, 'Variante actualizada');
    } catch (err: any) {
      if (err.message === 'Variante no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }

  async deleteVariant(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.deleteVariant(req.params.id);
      return ApiResponse.ok(res, null, 'Variante eliminada');
    } catch (err: any) {
      if (err.message === 'Variante no encontrada') {
        return ApiResponse.notFound(res, err.message);
      }
      next(err);
    }
  }
}
