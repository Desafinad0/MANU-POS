import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import categoriesRoutes from './modules/catalog/categories/categories.routes';
import productsRoutes from './modules/catalog/products/products.routes';
import recipesRoutes from './modules/catalog/recipes/recipes.routes';
import suppliesRoutes from './modules/inventory/supplies/supplies.routes';
import warehousesRoutes from './modules/inventory/warehouses/warehouses.routes';
import stockRoutes from './modules/inventory/stock/stock.routes';
import suppliersRoutes from './modules/suppliers/suppliers.routes';
import salesRoutes from './modules/sales/sales.routes';
import cashRegisterRoutes from './modules/cash-register/cash-register.routes';
import reportsRoutes from './modules/reports/reports.routes';
import ordersRoutes from './modules/orders/orders.routes';
import tablesRoutes from './modules/tables/tables.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usersRoutes);
router.use('/categorias', categoriesRoutes);
router.use('/productos', productsRoutes);
router.use('/recetas', recipesRoutes);
router.use('/insumos', suppliesRoutes);
router.use('/almacenes', warehousesRoutes);
router.use('/inventario', stockRoutes);
router.use('/proveedores', suppliersRoutes);
router.use('/ventas', salesRoutes);
router.use('/caja', cashRegisterRoutes);
router.use('/reportes', reportsRoutes);
router.use('/ordenes', ordersRoutes);
router.use('/mesas', tablesRoutes);

export default router;
