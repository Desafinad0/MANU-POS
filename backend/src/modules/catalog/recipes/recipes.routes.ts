import { Router } from 'express';
import { RecipesController } from './recipes.controller';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/role.middleware';
import { createRecipeSchema } from './recipes.schemas';

const router = Router();
const controller = new RecipesController();

router.use(authMiddleware);
router.use(requirePermission('RECETAS_GESTIONAR'));

router.get('/producto/:productoId', (req, res, next) => controller.findByProducto(req, res, next));
router.post('/', validate(createRecipeSchema), (req, res, next) => controller.createOrUpdate(req, res, next));
router.post('/:id/calcular-costo', (req, res, next) => controller.calculateCost(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
