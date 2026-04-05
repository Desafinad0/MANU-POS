import { Router } from 'express';
import { UsersController } from './users.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/role.middleware';
import { createUserSchema, updateUserSchema, assignRolesSchema, changePasswordSchema } from './users.schemas';

const router = Router();
const controller = new UsersController();

router.use(authMiddleware);
router.use(requirePermission('USUARIOS_GESTIONAR'));

router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/roles', (req, res, next) => controller.getRoles(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.post('/', validate(createUserSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', validate(updateUserSchema), (req, res, next) => controller.update(req, res, next));
router.patch('/:id/password', validate(changePasswordSchema), (req, res, next) => controller.changePassword(req, res, next));
router.patch('/:id/roles', validate(assignRolesSchema), (req, res, next) => controller.assignRoles(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
