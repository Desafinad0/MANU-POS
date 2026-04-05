import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/login/LoginPage';
import POSPage from './pages/pos/POSPage';
import KitchenDisplayPage from './pages/kitchen/KitchenDisplayPage';
import CashRegisterPage from './pages/cash-register/CashRegisterPage';
import CategoriesPage from './pages/catalog/CategoriesPage';
import ProductsPage from './pages/catalog/ProductsPage';
import RecipesPage from './pages/catalog/RecipesPage';
import SuppliesPage from './pages/inventory/SuppliesPage';
import StockPage from './pages/inventory/StockPage';
import MovementsPage from './pages/inventory/MovementsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SuppliersPage from './pages/inventory/SuppliersPage';
import PurchaseOrdersPage from './pages/inventory/PurchaseOrdersPage';
import UsersPage from './pages/admin/UsersPage';
import MesasPage from './pages/admin/MesasPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', padding: '12px 16px' },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cocina" element={
            <ProtectedRoute>
              <KitchenDisplayPage />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="caja" element={<CashRegisterPage />} />
            <Route path="categorias" element={<CategoriesPage />} />
            <Route path="productos" element={<ProductsPage />} />
            <Route path="recetas" element={<RecipesPage />} />
            <Route path="insumos" element={<SuppliesPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="movimientos" element={<MovementsPage />} />
            <Route path="proveedores" element={<SuppliersPage />} />
            <Route path="ordenes-compra" element={<PurchaseOrdersPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="mesas" element={<MesasPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
