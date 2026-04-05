import { useState, useEffect } from 'react';
import { BarChart3, DollarSign, TrendingUp, AlertTriangle, Calendar, FileText } from 'lucide-react';
import { reportsService } from '../../services/reports.service';
import { cashRegisterService } from '../../services/cash-register.service';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [tab, setTab] = useState<'ventas' | 'stock' | 'cajas'>('ventas');
  const [summary, setSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => { loadReports(); }, []);
  useEffect(() => { loadSales(); }, [selectedDate]);

  const loadSales = async () => {
    try {
      const data = await reportsService.getDailySales(selectedDate);
      setSummary(data);
    } catch { toast.error('Error al cargar ventas'); }
  };

  const loadReports = async () => {
    try {
      const [ventasData, stockData, cajasRes] = await Promise.all([
        reportsService.getDailySales(selectedDate),
        reportsService.getLowStock(),
        cashRegisterService.getAll(),
      ]);
      setSummary(ventasData);
      setLowStock(stockData || []);
      setCajas(cajasRes.data || []);
    } catch { toast.error('Error al cargar reportes'); }
    finally { setLoading(false); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString('es-MX');

  const tipoServicioLabel: Record<string, string> = {
    MESA: 'Mesa',
    PARA_LLEVAR: 'Para Llevar',
    PLATAFORMA: 'Plataforma',
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reportes</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('ventas')} className={tab === 'ventas' ? 'category-tab-active' : 'category-tab-inactive'}>
          <BarChart3 size={16} className="inline mr-1" /> Ventas del Día
        </button>
        <button onClick={() => setTab('stock')} className={tab === 'stock' ? 'category-tab-active' : 'category-tab-inactive'}>
          <AlertTriangle size={16} className="inline mr-1" /> Stock Bajo
        </button>
        <button onClick={() => setTab('cajas')} className={tab === 'cajas' ? 'category-tab-active' : 'category-tab-inactive'}>
          <FileText size={16} className="inline mr-1" /> Cortes de Caja
        </button>
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : tab === 'ventas' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-manu-teal"
            />
            <span className="text-sm text-gray-500">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {summary ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 text-center">
                  <DollarSign className="text-manu-teal mx-auto mb-1" size={24} />
                  <p className="text-2xl font-bold">${Number(summary.montoTotal || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Total Ventas</p>
                </div>
                <div className="card p-4 text-center">
                  <TrendingUp className="text-blue-500 mx-auto mb-1" size={24} />
                  <p className="text-2xl font-bold">{summary.ventasCompletadas || 0}</p>
                  <p className="text-xs text-gray-500">Transacciones</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold">${Number(summary.ticketPromedio || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Ticket Promedio</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold">{summary.ventasCanceladas || 0}</p>
                  <p className="text-xs text-gray-500">Canceladas</p>
                </div>
              </div>

              {summary.porMetodoPago?.length > 0 && (
                <div className="card p-4 mb-4">
                  <h3 className="font-semibold mb-3">Por Método de Pago</h3>
                  <div className="space-y-2">
                    {summary.porMetodoPago.map((item: any) => (
                      <div key={item.metodoPago} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">{item.metodoPago}</span>
                        <span className="font-bold">${Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.porTipoServicio?.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-3">Por Tipo de Servicio</h3>
                  <div className="space-y-2">
                    {summary.porTipoServicio.map((item: any) => (
                      <div key={item.tipoServicio} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">{tipoServicioLabel[item.tipoServicio] || item.tipoServicio}</span>
                        <span className="font-bold">${Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Sin datos de ventas para esta fecha.</p>
          )}
        </div>
      ) : tab === 'stock' ? (
        lowStock.length === 0 ? (
          <p className="text-green-500 text-center py-8">Todo el stock está en niveles aceptables.</p>
        ) : (
          <div className="space-y-2">
            {lowStock.map((item: any, i: number) => (
              <div key={i} className="card flex items-center gap-3 border-l-4 border-red-500">
                <AlertTriangle className="text-red-500" size={20} />
                <div className="flex-1">
                  <p className="font-medium">{item.nombre}</p>
                  <p className="text-sm text-gray-500">Stock: {Number(item.stockActual).toFixed(2)} / Mín: {Number(item.nivelMinimo).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3">Número</th>
                <th className="p-3">Fecha Apertura</th>
                <th className="p-3">Fecha Cierre</th>
                <th className="p-3">Cajero</th>
                <th className="p-3 text-right">Fondo Inicial</th>
                <th className="p-3 text-right">Efectivo</th>
                <th className="p-3 text-right">Tarjeta</th>
                <th className="p-3 text-right">Transferencia</th>
                <th className="p-3 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {cajas.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No hay cortes de caja registrados.</td></tr>
              ) : cajas.map((caja: any, i: number) => (
                <tr key={caja._id || i} className="border-b hover:bg-gray-50">
                  <td className="p-3">{caja.numero || i + 1}</td>
                  <td className="p-3">{caja.fechaApertura ? formatDate(caja.fechaApertura) : '-'}</td>
                  <td className="p-3">{caja.fechaCierre ? formatDate(caja.fechaCierre) : 'Abierta'}</td>
                  <td className="p-3">{caja.cajero?.nombre || caja.cajero || '-'}</td>
                  <td className="p-3 text-right">${Number(caja.fondoInicial || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">${Number(caja.efectivo || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">${Number(caja.tarjeta || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">${Number(caja.transferencia || 0).toFixed(2)}</td>
                  <td className={`p-3 text-right font-bold ${Number(caja.diferencia || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Number(caja.diferencia || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
