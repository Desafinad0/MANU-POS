import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, ChefHat, Timer } from 'lucide-react';
import { ordersService } from '../../services/orders.service';
import toast from 'react-hot-toast';

interface KitchenItem {
  id: string;
  nombreProducto: string;
  cantidad: number;
  notas?: string;
  estado: 'ENVIADO' | 'PREPARANDO' | 'LISTO';
  destino: 'COCINA' | 'BARRA';
  comensal: number;
  enviadoEn?: string;
}

interface KitchenOrder {
  id: string;
  numeroOrden: string;
  tipoServicio: string;
  mesa?: { id: string; nombre: string };
  creadoEn: string;
  detalles: KitchenItem[];
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [filter, setFilter] = useState<'COCINA' | 'BARRA' | 'TODOS'>('TODOS');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const destino = filter === 'TODOS' ? undefined : filter;
      const data = await ordersService.getForKitchen(destino);
      setOrders(data || []);
    } catch {
      // Silent retry
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (ordenId: string, itemId: string, newStatus: string) => {
    try {
      await ordersService.updateItemStatus(ordenId, itemId, newStatus);
      await loadOrders();
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const getElapsedTime = (dateStr?: string) => {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  };

  const statusColors: Record<string, string> = {
    ENVIADO: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    PREPARANDO: 'bg-blue-100 border-blue-400 text-blue-800',
    LISTO: 'bg-green-100 border-green-400 text-green-800',
  };

  const statusLabels: Record<string, string> = {
    ENVIADO: 'Nuevo',
    PREPARANDO: 'Preparando',
    LISTO: 'Listo',
  };

  const nextStatus: Record<string, string> = {
    ENVIADO: 'PREPARANDO',
    PREPARANDO: 'LISTO',
    LISTO: 'ENTREGADO',
  };

  const activeOrders = orders.filter((order) =>
    order.detalles?.some((d) => d.estado !== 'ENTREGADO')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="text-white" size={24} />
          <h1 className="text-xl font-bold text-white">Cocina - Manu Aguachiles</h1>
        </div>

        <div className="flex gap-2">
          {(['TODOS', 'COCINA', 'BARRA'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f
                  ? 'bg-manu-teal text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f === 'TODOS' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <CheckCircle size={64} className="mb-4" />
            <p className="text-xl">Sin pedidos pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.map((order) => {
              // Use the earliest enviadoEn from items for elapsed time
              const earliestEnvio = order.detalles
                .filter((d) => d.enviadoEn)
                .sort((a, b) => new Date(a.enviadoEn!).getTime() - new Date(b.enviadoEn!).getTime())[0]?.enviadoEn;
              const elapsed = getElapsedTime(earliestEnvio || order.creadoEn);
              const isUrgent = elapsed > 15;

              return (
                <div
                  key={order.id}
                  className={`rounded-xl overflow-hidden ${
                    isUrgent ? 'ring-2 ring-red-500' : 'ring-1 ring-gray-700'
                  }`}
                >
                  {/* Order header */}
                  <div
                    className={`px-4 py-2 flex items-center justify-between ${
                      isUrgent ? 'bg-red-600' : 'bg-gray-700'
                    }`}
                  >
                    <div>
                      <span className="text-white font-bold">{order.numeroOrden}</span>
                      <span className="text-gray-300 text-sm ml-2">
                        {order.tipoServicio === 'MESA' && order.mesa
                          ? order.mesa.nombre
                          : order.tipoServicio === 'PARA_LLEVAR'
                            ? 'Para llevar'
                            : 'Plataforma'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-300">
                      <Timer size={14} />
                      <span className="text-sm">{elapsed}m</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-gray-800 p-3 space-y-2">
                    {order.detalles
                      .filter((d) => d.estado !== 'ENTREGADO')
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            const next = nextStatus[item.estado];
                            if (next) updateStatus(order.id, item.id, next);
                          }}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${statusColors[item.estado] || ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              {item.cantidad}x {item.nombreProducto}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/50">
                              {statusLabels[item.estado] || item.estado}
                            </span>
                          </div>
                          {item.notas && (
                            <p className="text-xs mt-1 italic">{item.notas}</p>
                          )}
                          {item.comensal > 1 && (
                            <p className="text-xs mt-1 opacity-75">Comensal {item.comensal}</p>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
