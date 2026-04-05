import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/role.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { createOrderSchema, addItemsSchema, payOrderSchema, cancelOrderSchema, updateItemStatusSchema } from './orders.schemas';

const router = Router();
const controller = new OrdersController();

router.use(authMiddleware);

// Kitchen display - before :id routes
router.get('/cocina', (req, res, next) => controller.getForKitchen(req, res, next));

router.get('/', requirePermission('ORDENES_VER', 'VENTAS_VER'), (req, res, next) => controller.getAll(req, res, next));
router.get('/:id', requirePermission('ORDENES_VER', 'VENTAS_VER'), (req, res, next) => controller.getById(req, res, next));
router.post('/', requirePermission('ORDENES_CREAR', 'VENTAS_CREAR'), validate(createOrderSchema), (req, res, next) => controller.create(req, res, next));
router.patch('/:id/items', requirePermission('ORDENES_CREAR', 'VENTAS_CREAR'), validate(addItemsSchema), (req, res, next) => controller.addItems(req, res, next));
router.post('/:id/enviar-cocina', requirePermission('ORDENES_CREAR', 'VENTAS_CREAR'), (req, res, next) => controller.sendToKitchen(req, res, next));
router.patch('/:id/items/:itemId/estado', validate(updateItemStatusSchema), (req, res, next) => controller.updateItemStatus(req, res, next));
router.post('/:id/cobrar', requirePermission('VENTAS_CREAR'), validate(payOrderSchema), (req, res, next) => controller.pay(req, res, next));
router.patch('/:id/cancelar', requirePermission('ORDENES_CANCELAR', 'VENTAS_CANCELAR'), validate(cancelOrderSchema), (req, res, next) => controller.cancel(req, res, next));

export default router;
