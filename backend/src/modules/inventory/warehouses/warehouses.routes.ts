import { Router } from 'express';
import { WarehousesController } from './warehouses.controller';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/role.middleware';
import { createWarehouseSchema, updateWarehouseSchema } from './warehouses.schemas';

const router = Router();
const controller = new WarehousesController();

router.use(authMiddleware);

router.get('/', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.findById(req, res, next));
router.post('/', requirePermission('INVENTARIO_AJUSTES'), validate(createWarehouseSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('INVENTARIO_AJUSTES'), validate(updateWarehouseSchema), (req, res, next) => controller.update(req, res, next));

export default router;
