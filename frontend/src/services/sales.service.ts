import api from '../config/api';

export interface SaleItem {
  productoId: string;
  cantidad: number;
  varianteIds?: string[];
  notas?: string;
  comensal?: number;
}

export interface CreateSaleInput {
  tipoServicio: 'MESA' | 'PARA_LLEVAR' | 'PLATAFORMA';
  mesa?: string;
  plataforma?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  montoPagado: number;
  descuento?: number;
  comensales?: number;
  notas?: string;
  items: SaleItem[];
}

export const salesService = {
  getSales: (params?: any) => api.get('/ventas', { params }).then((r) => r.data),
  getKitchenOrders: () => api.get('/ventas/cocina').then((r) => r.data.data),
  getSale: (id: string) => api.get(`/ventas/${id}`).then((r) => r.data.data),
  createSale: (data: CreateSaleInput) => api.post('/ventas', data).then((r) => r.data.data),
  cancelSale: (id: string, motivoCancelacion: string) =>
    api.patch(`/ventas/${id}/cancelar`, { motivoCancelacion }).then((r) => r.data.data),
  updateItemStatus: (ventaId: string, itemId: string, estado: string) =>
    api.patch(`/ventas/${ventaId}/items/${itemId}/estado`, { estado }).then((r) => r.data.data),
  getDailySummary: (fecha?: string) =>
    api.get('/ventas/resumen/diario', { params: { fecha } }).then((r) => r.data.data),
};
