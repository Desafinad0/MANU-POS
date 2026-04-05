import { Router } from 'express';
import { ProductsController } from './products.controller';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/role.middleware';
import { createProductSchema, updateProductSchema, createVariantSchema, updateVariantSchema } from './products.schemas';

const router = Router();
const controller = new ProductsController();

router.use(authMiddleware);

router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/pos', (req, res, next) => controller.findForPOS(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.post('/', requirePermission('PRODUCTOS_CREAR'), validate(createProductSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('PRODUCTOS_EDITAR'), validate(updateProductSchema), (req, res, next) => controller.update(req, res, next));
router.patch('/:id/disponibilidad', requirePermission('PRODUCTOS_EDITAR'), (req, res, next) => controller.toggleDisponibilidad(req, res, next));
router.delete('/:id', requirePermission('PRODUCTOS_ELIMINAR'), (req, res, next) => controller.delete(req, res, next));

// Variants sub-routes
router.post('/:productoId/variantes', requirePermission('PRODUCTOS_CREAR'), validate(createVariantSchema), (req, res, next) => controller.addVariant(req, res, next));
router.put('/variantes/:id', requirePermission('PRODUCTOS_EDITAR'), validate(updateVariantSchema), (req, res, next) => controller.updateVariant(req, res, next));
router.delete('/variantes/:id', requirePermission('PRODUCTOS_ELIMINAR'), (req, res, next) => controller.deleteVariant(req, res, next));

export default router;
