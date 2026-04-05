import api from '../config/api';

export interface OrderItem {
  productoId: string;
  cantidad: number;
  varianteIds?: string[];
  notas?: string;
  comensal?: number;
}

export interface CreateOrderInput {
  tipoServicio: 'MESA' | 'PARA_LLEVAR' | 'PLATAFORMA';
  mesaId?: string;
  comensales?: number;
  clienteNombre?: string;
  clienteTelefono?: string;
  plataforma?: string;
  notas?: string;
  items: OrderItem[];
}

export interface PayOrderInput {
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  montoPagado: number;
  descuento?: number;
  notas?: string;
}

export interface OrdenDetalle {
  id: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  notas?: string;
  comensal: number;
  destino: string;
  estado: 'GUARDADO' | 'ENVIADO' | 'PREPARANDO' | 'LISTO' | 'ENTREGADO';
  enviadoEn?: string;
  productoId: string;
  producto?: { id: string; nombre: string; sku: string; imagen?: string };
  variantes?: any[];
}

export interface Orden {
  id: string;
  numeroOrden: string;
  tipoServicio: string;
  comensales: number;
  clienteNombre?: string;
  clienteTelefono?: string;
  plataforma?: string;
  notas?: string;
  estado: 'ABIERTA' | 'EN_COCINA' | 'LISTA' | 'POR_COBRAR' | 'COBRADA' | 'CANCELADA';
  descuento: number;
  motivoCancelacion?: string;
  fecha: string;
  creadoEn: string;
  mesaId?: string;
  mesa?: { id: string; nombre: string; zona: string };
  usuario?: { id: string; nombre: string; apellido: string };
  detalles: OrdenDetalle[];
  _count?: { detalles: number };
}

export const ordersService = {
  getAll: (params?: { estado?: string; tipoServicio?: string; mesaId?: string; incluirCerradas?: string }) =>
    api.get('/ordenes', { params }).then((r) => r.data.data),
  getById: (id: string): Promise<Orden> =>
    api.get(`/ordenes/${id}`).then((r) => r.data.data),
  create: (data: CreateOrderInput): Promise<Orden> =>
    api.post('/ordenes', data).then((r) => r.data.data),
  addItems: (id: string, items: OrderItem[]) =>
    api.patch(`/ordenes/${id}/items`, { items }).then((r) => r.data.data),
  sendToKitchen: (id: string): Promise<Orden> =>
    api.post(`/ordenes/${id}/enviar-cocina`).then((r) => r.data.data),
  updateItemStatus: (ordenId: string, itemId: string, estado: string) =>
    api.patch(`/ordenes/${ordenId}/items/${itemId}/estado`, { estado }).then((r) => r.data.data),
  getForKitchen: (destino?: string) =>
    api.get('/ordenes/cocina', { params: { destino } }).then((r) => r.data.data),
  pay: (id: string, data: PayOrderInput) =>
    api.post(`/ordenes/${id}/cobrar`, data).then((r) => r.data.data),
  cancel: (id: string, motivoCancelacion: string) =>
    api.patch(`/ordenes/${id}/cancelar`, { motivoCancelacion }).then((r) => r.data.data),
};
