import { Router } from 'express';
import { SuppliesController } from './supplies.controller';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/role.middleware';
import { createSupplySchema, updateSupplySchema } from './supplies.schemas';

const router = Router();
const controller = new SuppliesController();

router.use(authMiddleware);

router.get('/', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', requirePermission('INVENTARIO_VER'), (req, res, next) => controller.findById(req, res, next));
router.post('/', requirePermission('INVENTARIO_ENTRADAS'), validate(createSupplySchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('INVENTARIO_ENTRADAS'), validate(updateSupplySchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', requirePermission('INVENTARIO_ENTRADAS'), (req, res, next) => controller.delete(req, res, next));

export default router;
