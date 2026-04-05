import { Router } from 'express';
import { SalesController } from './sales.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/role.middleware';
import { createSaleSchema, cancelSaleSchema, updateItemStatusSchema } from './sales.schemas';

const router = Router();
const controller = new SalesController();

router.use(authMiddleware);

router.get('/', requirePermission('VENTAS_VER'), (req, res, next) => controller.findAll(req, res, next));
router.get('/cocina', (req, res, next) => controller.getKitchenOrders(req, res, next));
router.get('/resumen/diario', requirePermission('REPORTES_VER'), (req, res, next) => controller.getDailySummary(req, res, next));
router.get('/:id', requirePermission('VENTAS_VER'), (req, res, next) => controller.findById(req, res, next));
router.post('/', requirePermission('VENTAS_CREAR'), validate(createSaleSchema), (req, res, next) => controller.create(req, res, next));
router.patch('/:id/cancelar', requirePermission('VENTAS_CANCELAR'), validate(cancelSaleSchema), (req, res, next) => controller.cancel(req, res, next));
router.patch('/:id/items/:itemId/estado', requirePermission('VENTAS_VER'), validate(updateItemStatusSchema), (req, res, next) => controller.updateItemStatus(req, res, next));

export default router;
