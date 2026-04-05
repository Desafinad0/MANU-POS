import { Router } from 'express';
import { CashRegisterController } from './cash-register.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/role.middleware';
import { openCashRegisterSchema, closeCashRegisterSchema } from './cash-register.schemas';

const router = Router();
const controller = new CashRegisterController();

router.use(authMiddleware);

router.get('/', requirePermission('CAJA_VER_TODAS'), (req, res, next) => controller.findAll(req, res, next));
router.get('/actual', requirePermission('CAJA_ABRIR'), (req, res, next) => controller.getCurrentOpen(req, res, next));
router.get('/:id', requirePermission('CAJA_VER_TODAS'), (req, res, next) => controller.findById(req, res, next));
router.get('/:id/reporte', requirePermission('REPORTES_VER'), (req, res, next) => controller.getReport(req, res, next));
router.post('/abrir', requirePermission('CAJA_ABRIR'), validate(openCashRegisterSchema), (req, res, next) => controller.open(req, res, next));
router.post('/:id/cerrar', requirePermission('CAJA_CERRAR'), validate(closeCashRegisterSchema), (req, res, next) => controller.close(req, res, next));

export default router;
