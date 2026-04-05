import { Router } from 'express';
import { StockController } from './stock.controller';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/role.middleware';
import { createMovementSchema, createPurchaseSchema, transferSchema } from './stock.schemas';

const router = Router();
const controller = new StockController();

router.use(authMiddleware);

router.get('/', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.getCurrentStock(req, res, next));
router.get('/alertas', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.getAlerts(req, res, next));
router.get('/kardex/:insumoId', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.getKardex(req, res, next));
router.get('/ordenes-compra', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.getPurchaseOrders(req, res, next));
router.get('/ordenes-compra/:folio', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.getPurchaseOrderDetail(req, res, next));
router.post('/ordenes-compra/:folio/cancelar', requirePermission('INVENTARIO_ENTRADAS'), (req, res, next) => controller.cancelPurchaseOrder(req, res, next));
router.post('/movimiento', requirePermission('INVENTARIO_ENTRADAS'), validate(createMovementSchema), (req, res, next) => controller.recordMovement(req, res, next));
router.post('/compra', requirePermission('INVENTARIO_ENTRADAS'), validate(createPurchaseSchema), (req, res, next) => controller.recordPurchase(req, res, next));
router.post('/transferencia', requirePermission('INVENTARIO_TRANSFERENCIAS'), validate(transferSchema), (req, res, next) => controller.transferStock(req, res, next));

export default router;
