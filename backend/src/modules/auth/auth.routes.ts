import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { loginSchema, pinLoginSchema } from './auth.schemas';

const router = Router();
const controller = new AuthController();

router.post('/login', validate(loginSchema), (req, res, next) => controller.login(req, res, next));
router.post('/pin', validate(pinLoginSchema), (req, res, next) => controller.loginWithPin(req, res, next));
router.get('/me', authMiddleware, (req, res, next) => controller.me(req, res, next));

export default router;
