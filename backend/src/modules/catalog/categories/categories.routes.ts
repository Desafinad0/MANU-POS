import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/role.middleware';
import { createCategorySchema, updateCategorySchema, updateOrderSchema } from './categories.schemas';

const router = Router();
const controller = new CategoriesController();

router.use(authMiddleware);

router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.post('/', requirePermission('PRODUCTOS_CREAR'), validate(createCategorySchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('PRODUCTOS_EDITAR'), validate(updateCategorySchema), (req, res, next) => controller.update(req, res, next));
router.patch('/:id/orden', requirePermission('PRODUCTOS_EDITAR'), validate(updateOrderSchema), (req, res, next) => controller.updateOrder(req, res, next));
router.delete('/:id', requirePermission('PRODUCTOS_ELIMINAR'), (req, res, next) => controller.delete(req, res, next));

export default router;
