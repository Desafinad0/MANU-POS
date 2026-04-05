import { Router } from 'express';
import { SuppliersController } from './suppliers.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/role.middleware';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schemas';

const router = Router();
const controller = new SuppliersController();

router.use(authMiddleware);

router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.post('/', requirePermission('INVENTARIO_ENTRADAS'), validate(createSupplierSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('INVENTARIO_ENTRADAS'), validate(updateSupplierSchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', requirePermission('INVENTARIO_ENTRADAS'), (req, res, next) => controller.delete(req, res, next));

export default router;
