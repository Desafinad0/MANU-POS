import api from '../config/api';

export interface Supply {
  id: string;
  nombre: string;
  descripcion?: string;
  sku?: string;
  unidadMedida: 'KG' | 'LT' | 'PZA' | 'ML' | 'GR';
  categoria?: string;
  costoPromedio: number;
  costoUltimo: number;
  nivelMinimo: number;
  nivelMaximo: number;
  perecedero: boolean;
  activo: boolean;
}

export interface Warehouse {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface StockItem {
  id: string;
  insumoId: string;
  almacenId: string;
  cantidadActual: number;
  costoPromedio: number;
  fechaCaducidad?: string;
  insumo: Supply;
  almacen: Warehouse;
}

export interface StockAlert {
  insumoId: string;
  nombre: string;
  unidadMedida: string;
  nivelMinimo: number;
  cantidadActual: number;
  tipo: 'stock_bajo' | 'por_caducar';
  fechaCaducidad?: string;
}

export interface Movement {
  id: string;
  insumoId: string;
  tipo: string;
  cantidad: number;
  costoUnitario?: number;
  stockAnterior: number;
  stockPosterior: number;
  referencia?: string;
  notas?: string;
  fecha: string;
  usuarioId: string;
  insumo?: Supply;
}

export interface Supplier {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
  activo: boolean;
}

export interface CreateMovementInput {
  insumoId: string;
  almacenId: string;
  tipo: 'COMPRA' | 'MERMA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'DEVOLUCION' | 'CONSUMO_INTERNO';
  cantidad: number;
  costoUnitario?: number;
  referencia?: string;
  notas?: string;
  proveedorId?: string;
  fecha?: string;
}

const TIPOS_ENTRADA = ['COMPRA', 'AJUSTE_POSITIVO', 'INVENTARIO_INICIAL', 'DEVOLUCION'];

export interface TransferInput {
  insumoId: string;
  almacenOrigenId: string;
  almacenDestinoId: string;
  cantidad: number;
  notas?: string;
}

export const inventoryService = {
  // Supplies (Insumos)
  getSupplies: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/insumos', { params }).then((r) => r.data),
  getSupply: (id: string) => api.get(`/insumos/${id}`).then((r) => r.data.data),
  createSupply: (data: Partial<Supply>) => api.post('/insumos', data).then((r) => r.data.data),
  updateSupply: (id: string, data: Partial<Supply>) => api.put(`/insumos/${id}`, data).then((r) => r.data.data),
  deleteSupply: (id: string) => api.delete(`/insumos/${id}`),

  // Warehouses (Almacenes)
  getWarehouses: () => api.get('/almacenes').then((r) => r.data.data),
  createWarehouse: (data: Partial<Warehouse>) => api.post('/almacenes', data).then((r) => r.data.data),
  updateWarehouse: (id: string, data: Partial<Warehouse>) => api.put(`/almacenes/${id}`, data).then((r) => r.data.data),

  // Stock
  getStock: (params?: { almacenId?: string; insumoId?: string }) =>
    api.get('/inventario', { params }).then((r) => r.data.data),
  getAlerts: () => api.get('/inventario/alertas').then((r) => r.data.data),
  getKardex: (insumoId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/inventario/kardex/${insumoId}`, { params }).then((r) => r.data),

  // Purchases (bulk)
  createPurchase: (data: {
    proveedorId?: string;
    almacenDestinoId: string;
    fecha?: string;
    notas?: string;
    partidas: { insumoId: string; cantidad: number; costoUnitario: number }[];
  }) => api.post('/inventario/compra', data).then((r) => r.data),

  // Movements
  createMovement: (data: CreateMovementInput & { proveedorId?: string }) => {
    const { almacenId, tipo, proveedorId, ...rest } = data;
    const isEntrada = TIPOS_ENTRADA.includes(tipo);
    const payload: any = {
      ...rest,
      tipoMovimiento: tipo,
      ...(isEntrada ? { almacenDestinoId: almacenId } : { almacenOrigenId: almacenId }),
    };
    if (proveedorId) payload.proveedorId = proveedorId;
    return api.post('/inventario/movimiento', payload).then((r) => r.data.data);
  },
  createTransfer: (data: TransferInput) =>
    api.post('/inventario/transferencia', data).then((r) => r.data.data),

  // Purchase Orders (Órdenes de Compra)
  getPurchaseOrders: (params?: { page?: number; limit?: number; folio?: string; proveedorId?: string; fechaDesde?: string; fechaHasta?: string }) =>
    api.get('/inventario/ordenes-compra', { params }).then((r) => r.data),
  getPurchaseOrderDetail: (folio: string) =>
    api.get(`/inventario/ordenes-compra/${encodeURIComponent(folio)}`).then((r) => r.data.data),
  cancelPurchaseOrder: (folio: string) =>
    api.post(`/inventario/ordenes-compra/${encodeURIComponent(folio)}/cancelar`).then((r) => r.data),

  // Suppliers (Proveedores)
  getSuppliers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/proveedores', { params }).then((r) => r.data),
  getSupplier: (id: string) => api.get(`/proveedores/${id}`).then((r) => r.data.data),
  createSupplier: (data: Partial<Supplier>) => api.post('/proveedores', data).then((r) => r.data.data),
  updateSupplier: (id: string, data: Partial<Supplier>) => api.put(`/proveedores/${id}`, data).then((r) => r.data.data),
  deleteSupplier: (id: string) => api.delete(`/proveedores/${id}`),
};
