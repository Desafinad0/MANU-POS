import { Router } from 'express';
import { TablesController } from './tables.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/role.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { createTableSchema, updateTableSchema } from './tables.schemas';

const router = Router();
const controller = new TablesController();

router.use(authMiddleware);

router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.post('/', requirePermission('MESAS_GESTIONAR'), validate(createTableSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', requirePermission('MESAS_GESTIONAR'), validate(updateTableSchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', requirePermission('MESAS_GESTIONAR'), (req, res, next) => controller.remove(req, res, next));
router.patch('/:id/estado', requirePermission('ORDENES_CREAR'), (req, res, next) => controller.updateEstado(req, res, next));

export default router;
