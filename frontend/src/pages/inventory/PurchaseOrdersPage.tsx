import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, XCircle, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { inventoryService } from '../../services/inventory.service';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface PurchaseOrder {
  folio: string;
  fecha: string;
  proveedor: { id: string; nombre: string } | null;
  almacen: { id: string; nombre: string } | null;
  usuario: { id: string; nombre: string; apellido: string } | null;
  notas: string | null;
  cancelado: boolean;
  partidas: Partida[];
  total: number;
}

interface Partida {
  id: string;
  insumo: { id: string; nombre: string; sku: string; unidadMedida: string };
  cantidad: string | number;
  costoUnitario: string | number;
  costoTotal: string | number;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Filters
  const [folioSearch, setFolioSearch] = useState('');
  const [proveedorFilter, setProveedorFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'' | 'ACTIVA' | 'CANCELADA'>('');

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Cancel dialog
  const [cancelFolio, setCancelFolio] = useState<string | null>(null);

  const limit = 20;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (folioSearch) params.folio = folioSearch;
      if (proveedorFilter) params.proveedorId = proveedorFilter;
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;

      const res = await inventoryService.getPurchaseOrders(params);
      setOrders(res.data || []);
      setTotal(res.total || 0);
    } catch {
      toast.error('Error al cargar órdenes de compra');
    } finally {
      setLoading(false);
    }
  }, [page, folioSearch, proveedorFilter, fechaDesde, fechaHasta]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    inventoryService.getSuppliers({ limit: 200 }).then((r) => {
      setSuppliers(r.data || []);
    }).catch(() => {});
  }, []);

  const handleViewDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const handleCancel = async () => {
    if (!cancelFolio) return;
    try {
      const res = await inventoryService.cancelPurchaseOrder(cancelFolio);
      toast.success(res.message || `Orden ${cancelFolio} cancelada`);
      setCancelFolio(null);
      loadOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cancelar');
    }
  };

  const handlePrint = (order: PurchaseOrder) => {
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    const rows = order.partidas.map((p) =>
      `<tr>
        <td style="padding:6px;border:1px solid #ddd">${p.insumo.sku}</td>
        <td style="padding:6px;border:1px solid #ddd">${p.insumo.nombre}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${p.insumo.unidadMedida}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${Number(p.cantidad).toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">$${Number(p.costoUnitario).toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">$${Number(p.costoTotal).toFixed(2)}</td>
      </tr>`
    ).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>Orden ${order.folio}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px}table{border-collapse:collapse;width:100%}th{background:#f5f5f5;padding:8px;border:1px solid #ddd;text-align:left}h1{color:#333;font-size:20px}
      .header{display:flex;justify-content:space-between;margin-bottom:20px}.meta{color:#666;font-size:13px}
      @media print{.no-print{display:none}}</style></head><body>
      <div class="header"><div><h1>Orden de Compra</h1><p style="font-size:24px;font-weight:bold;color:#0d9488">${order.folio}</p></div>
      <div style="text-align:right"><p class="meta">Fecha: ${new Date(order.fecha).toLocaleDateString('es-MX')}</p>
      <p class="meta">Proveedor: ${order.proveedor?.nombre || 'N/A'}</p>
      <p class="meta">Almacén: ${order.almacen?.nombre || 'N/A'}</p>
      <p class="meta">Registró: ${order.usuario ? order.usuario.nombre + ' ' + order.usuario.apellido : 'N/A'}</p></div></div>
      ${order.cancelado ? '<p style="color:red;font-weight:bold;font-size:18px">⛔ CANCELADA</p>' : ''}
      <table><thead><tr><th>SKU</th><th>Insumo</th><th style="text-align:center">Unidad</th><th style="text-align:right">Cantidad</th><th style="text-align:right">C. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">TOTAL</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;font-size:16px">$${order.total.toFixed(2)}</td></tr></tfoot></table>
      ${order.notas ? `<p style="margin-top:16px;color:#666"><strong>Notas:</strong> ${order.notas}</p>` : ''}
      <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#0d9488;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir</button>
      </body></html>`);
    w.document.close();
  };

  const exportToExcel = () => {
    if (orders.length === 0) { toast.error('No hay órdenes para exportar'); return; }

    // Build CSV with BOM for Excel compatibility
    const BOM = '\uFEFF';
    const headers = ['# REGISTRO', 'Fecha', 'SKU', 'Insumo', 'Cantidad', 'Costo Unit.', 'Subtotal', 'Proveedor', 'Folio', 'Almacén', 'Partidas', 'Unidad', 'Total', 'Estado', 'Registró', 'Notas'];
    const allRows: string[][] = [];
    allRows.push(headers);

    let registro = 1;
    for (const o of orders) {
      const orderNum = registro;
      for (const p of o.partidas) {
        allRows.push([
          String(orderNum),
          new Date(o.fecha).toLocaleDateString('es-MX'),
          p.insumo.sku,
          p.insumo.nombre,
          Number(p.cantidad).toFixed(0),
          `$ ${Number(p.costoUnitario).toFixed(2)}`,
          `$ ${Number(p.costoTotal).toFixed(2)}`,
          o.proveedor?.nombre || '',
          o.folio,
          o.almacen?.nombre || '',
          String(o.partidas.length),
          p.insumo.unidadMedida,
          `$ ${o.total.toFixed(2)}`,
          o.cancelado ? 'CANCELADA' : 'ACTIVA',
          o.usuario ? `${o.usuario.nombre} ${o.usuario.apellido}` : '',
          o.notas || '',
        ]);
      }
      registro++;
    }

    const csv = BOM + allRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordenes_compra_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo exportado');
  };

  // Client-side filter by estado
  const filteredOrders = estadoFilter
    ? orders.filter((o) => estadoFilter === 'CANCELADA' ? o.cancelado : !o.cancelado)
    : orders;

  // Totals for visible orders
  const sumTotal = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const sumPartidas = filteredOrders.reduce((sum, o) => sum + o.partidas.length, 0);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes de Compra</h1>
        <button onClick={exportToExcel} className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2">
          <FileSpreadsheet size={18} /> Exportar Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={folioSearch}
              onChange={(e) => { setFolioSearch(e.target.value); setPage(1); }}
              className="input pl-9"
              placeholder="Buscar por folio..."
            />
          </div>
          <select
            value={proveedorFilter}
            onChange={(e) => { setProveedorFilter(e.target.value); setPage(1); }}
            className="input"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select
            value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value as any); setPage(1); }}
            className="input"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVA">Activa</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500 text-center py-8">Cargando...</p>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Download size={48} className="mx-auto mb-2" />
          <p>No se encontraron órdenes de compra</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Folio</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-center font-medium">Partidas</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Estado</th>
                  <th className="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order, idx) => (
                  <tr key={order.folio} className={order.cancelado ? 'bg-red-50 opacity-60' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * limit + idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-manu-teal">{order.folio}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(order.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3">{order.proveedor?.nombre || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-3 text-center">{order.partidas.length}</td>
                    <td className="px-4 py-3 text-right font-semibold">${order.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {order.cancelado ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Cancelada</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Activa</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleViewDetail(order)} className="p-1.5 rounded hover:bg-gray-200 text-blue-600" title="Ver detalle">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handlePrint(order)} className="p-1.5 rounded hover:bg-gray-200 text-gray-600" title="Imprimir">
                          <Printer size={16} />
                        </button>
                        {!order.cancelado && (
                          <button onClick={() => setCancelFolio(order.folio)} className="p-1.5 rounded hover:bg-red-100 text-red-500" title="Cancelar">
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredOrders.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-semibold text-sm">
                    <td className="px-4 py-3" colSpan={4}>TOTALES ({filteredOrders.length} órdenes)</td>
                    <td className="px-4 py-3 text-center">{sumPartidas}</td>
                    <td className="px-4 py-3 text-right text-lg">${sumTotal.toFixed(2)}</td>
                    <td className="px-4 py-3" colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">{total} orden(es) encontrada(s)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Anterior</button>
                <span className="px-3 py-2 text-sm">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`Orden ${selectedOrder?.folio || ''}`} size="xl">
        {selectedOrder && (
          <div>
            {/* Header info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <span className="text-xs text-gray-500 block">Folio</span>
                <span className="font-mono font-bold text-lg text-manu-teal">{selectedOrder.folio}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Fecha</span>
                <span className="font-medium">{new Date(selectedOrder.fecha).toLocaleDateString('es-MX')}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Proveedor</span>
                <span className="font-medium">{selectedOrder.proveedor?.nombre || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Almacén</span>
                <span className="font-medium">{selectedOrder.almacen?.nombre || 'N/A'}</span>
              </div>
            </div>

            {selectedOrder.cancelado && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 font-medium text-sm">
                Esta orden fue cancelada. Los movimientos de inventario fueron revertidos.
              </div>
            )}

            {/* Partidas table */}
            <table className="w-full text-sm mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">SKU</th>
                  <th className="px-3 py-2 text-left font-medium">Insumo</th>
                  <th className="px-3 py-2 text-center font-medium">Unidad</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">C. Unit.</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedOrder.partidas.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.insumo.sku}</td>
                    <td className="px-3 py-2 font-medium">{p.insumo.nombre}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{p.insumo.unidadMedida}</td>
                    <td className="px-3 py-2 text-right">{Number(p.cantidad).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">${Number(p.costoUnitario).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-semibold">${Number(p.costoTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={6} className="px-3 py-3 text-right font-bold">TOTAL</td>
                  <td className="px-3 py-3 text-right font-bold text-lg">${selectedOrder.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {selectedOrder.notas && (
              <p className="text-sm text-gray-500"><strong>Notas:</strong> {selectedOrder.notas}</p>
            )}

            <div className="text-xs text-gray-400 mt-2">
              Registró: {selectedOrder.usuario ? `${selectedOrder.usuario.nombre} ${selectedOrder.usuario.apellido}` : 'N/A'}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <button onClick={() => handlePrint(selectedOrder)} className="btn-primary bg-gray-600 hover:bg-gray-700 flex items-center gap-2">
                <Printer size={16} /> Imprimir
              </button>
              {!selectedOrder.cancelado && (
                <button onClick={() => { setShowDetail(false); setCancelFolio(selectedOrder.folio); }} className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2">
                  <XCircle size={16} /> Cancelar Orden
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelFolio}
        onClose={() => setCancelFolio(null)}
        onConfirm={handleCancel}
        title="Cancelar Orden de Compra"
        message={`¿Estás seguro de cancelar la orden ${cancelFolio}? Se revertirán todos los movimientos de inventario asociados. Esta acción no se puede deshacer.`}
        confirmText="Sí, Cancelar Orden"
        variant="danger"
      />
    </div>
  );
}
