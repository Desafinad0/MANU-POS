import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/role.middleware';

const router = Router();
const controller = new ReportsController();

router.use(authMiddleware);
router.use(requirePermission('REPORTES_VER'));

router.get('/ventas-diarias', (req, res, next) => controller.ventasDiarias(req, res, next));
router.get('/corte-caja/:cajaId', (req, res, next) => controller.corteCaja(req, res, next));
router.get('/stock-bajo', (req, res, next) => controller.stockBajo(req, res, next));

export default router;
