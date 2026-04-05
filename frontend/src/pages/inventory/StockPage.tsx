import { useState, useEffect } from 'react';
import { AlertTriangle, Package, Filter } from 'lucide-react';
import { inventoryService } from '../../services/inventory.service';
import toast from 'react-hot-toast';

export default function StockPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stock' | 'alertas'>('stock');

  useEffect(() => { loadInitial(); }, []);

  useEffect(() => { loadStock(); }, [warehouseFilter]);

  const loadInitial = async () => {
    try {
      const [stockData, alertsData, warehousesData] = await Promise.all([
        inventoryService.getStock(),
        inventoryService.getAlerts(),
        inventoryService.getWarehouses(),
      ]);
      setStock(stockData || []);
      setAlerts(alertsData || []);
      setWarehouses(warehousesData || []);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const loadStock = async () => {
    if (!warehouses.length && !warehouseFilter) return;
    try {
      const params = warehouseFilter ? { almacenId: warehouseFilter } : undefined;
      const data = await inventoryService.getStock(params);
      setStock(data || []);
    } catch { toast.error('Error al filtrar stock'); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Stock e Inventario</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('stock')} className={tab === 'stock' ? 'category-tab-active' : 'category-tab-inactive'}>
          <Package size={16} className="inline mr-1" /> Stock Actual
        </button>
        <button onClick={() => setTab('alertas')} className={tab === 'alertas' ? 'category-tab-active' : 'category-tab-inactive'}>
          <AlertTriangle size={16} className="inline mr-1" /> Alertas
          {alerts.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{alerts.length}</span>}
        </button>
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : tab === 'stock' ? (
        <>
          {/* Warehouse filter */}
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-gray-400" />
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="input max-w-xs"
            >
              <option value="">Todos los almacenes</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.nombre}</option>
              ))}
            </select>
          </div>

          {stock.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>Sin registros de inventario.</p></div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left font-medium">Insumo</th>
                  <th className="px-4 py-3 text-left font-medium">Almacén</th>
                  <th className="px-4 py-3 text-left font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-left font-medium">Unidad</th>
                  <th className="px-4 py-3 text-left font-medium">Costo Prom.</th>
                  <th className="px-4 py-3 text-left font-medium">Caducidad</th>
                </tr></thead>
                <tbody className="divide-y">
                  {stock.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium">{s.insumo?.nombre}</td>
                      <td className="px-4 py-3">{s.almacen?.nombre}</td>
                      <td className="px-4 py-3 font-semibold">{Number(s.cantidadActual).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500">{s.insumo?.unidadMedida}</td>
                      <td className="px-4 py-3">${Number(s.costoPromedio).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500">{s.fechaCaducidad ? new Date(s.fechaCaducidad).toLocaleDateString('es-MX') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        alerts.length === 0 ? (
          <div className="text-center py-12 text-green-500"><p>Sin alertas. Todo en orden.</p></div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a: any, i: number) => (
              <div key={i} className="card flex items-center gap-3 border-l-4 border-red-500">
                <AlertTriangle className="text-red-500" size={20} />
                <div>
                  <p className="font-medium">{a.nombre || a.insumo?.nombre}</p>
                  <p className="text-sm text-gray-500">{a.motivo || 'Stock bajo nivel mínimo'}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
