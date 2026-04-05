import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  LayoutGrid,
  Package,
  Warehouse,
  BarChart3,
  Users,
  Settings,
  CookingPot,
  DollarSign,
  LogOut,
  ChevronDown,
  X,
  UtensilsCrossed,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout, hasPermission } = useAuth();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-manu-teal text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-lg font-bold text-manu-teal">Manu</h1>
            <p className="text-xs text-gray-500">Aguachiles POS</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <NavLink to="/pos" className={linkClass} onClick={onClose}>
            <ShoppingCart size={20} />
            Punto de Venta
          </NavLink>

          <NavLink to="/cocina" className={linkClass} onClick={onClose}>
            <CookingPot size={20} />
            Cocina
          </NavLink>

          {/* Catalog */}
          <div>
            <button
              onClick={() => setCatalogOpen(!catalogOpen)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <span className="flex items-center gap-3">
                <LayoutGrid size={20} />
                Catálogo
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${catalogOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {catalogOpen && (
              <div className="ml-6 space-y-1">
                <NavLink to="/categorias" className={linkClass} onClick={onClose}>
                  Categorías
                </NavLink>
                <NavLink to="/productos" className={linkClass} onClick={onClose}>
                  Productos
                </NavLink>
                <NavLink to="/recetas" className={linkClass} onClick={onClose}>
                  Recetas
                </NavLink>
              </div>
            )}
          </div>

          {/* Inventory */}
          {hasPermission('INVENTARIO_VER') && (
            <div>
              <button
                onClick={() => setInventoryOpen(!inventoryOpen)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <span className="flex items-center gap-3">
                  <Warehouse size={20} />
                  Inventario
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${inventoryOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {inventoryOpen && (
                <div className="ml-6 space-y-1">
                  <NavLink to="/insumos" className={linkClass} onClick={onClose}>
                    Insumos
                  </NavLink>
                  <NavLink to="/stock" className={linkClass} onClick={onClose}>
                    Stock
                  </NavLink>
                  <NavLink to="/movimientos" className={linkClass} onClick={onClose}>
                    Movimientos
                  </NavLink>
                  <NavLink to="/proveedores" className={linkClass} onClick={onClose}>
                    Proveedores
                  </NavLink>
                  <NavLink to="/ordenes-compra" className={linkClass} onClick={onClose}>
                    Órdenes de Compra
                  </NavLink>
                </div>
              )}
            </div>
          )}

          <NavLink to="/caja" className={linkClass} onClick={onClose}>
            <DollarSign size={20} />
            Caja
          </NavLink>

          {hasPermission('REPORTES_VER') && (
            <NavLink to="/reportes" className={linkClass} onClick={onClose}>
              <BarChart3 size={20} />
              Reportes
            </NavLink>
          )}

          {hasPermission('MESAS_GESTIONAR') && (
            <NavLink to="/mesas" className={linkClass} onClick={onClose}>
              <UtensilsCrossed size={20} />
              Mesas
            </NavLink>
          )}

          {hasPermission('USUARIOS_GESTIONAR') && (
            <NavLink to="/usuarios" className={linkClass} onClick={onClose}>
              <Users size={20} />
              Usuarios
            </NavLink>
          )}
        </nav>

        {/* User info */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.nombre} {user?.apellido}</p>
              <p className="text-xs text-gray-500">{user?.roles.join(', ')}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
