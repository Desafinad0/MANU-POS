import api from '../config/api';

export interface DailySalesReport {
  fecha: string;
  totalVentas: number;
  cantidadTransacciones: number;
  ticketPromedio: number;
  cancelaciones: number;
  porMetodoPago: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  porHora: { hora: number; total: number; cantidad: number }[];
}

export interface CashReport {
  id: string;
  numero: string;
  fondoInicial: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  conteoFisico: number;
  diferencia: number;
  observaciones?: string;
  fechaApertura: string;
  fechaCierre: string;
  usuario: { nombre: string };
}

export interface LowStockItem {
  insumoId: string;
  nombre: string;
  unidadMedida: string;
  nivelMinimo: number;
  cantidadTotal: number;
  deficit: number;
}

export const reportsService = {
  getDailySales: (fecha?: string) =>
    api.get('/reportes/ventas-diarias', { params: { fecha } }).then((r) => r.data.data),
  getCashReport: (cajaId: string) =>
    api.get(`/reportes/corte-caja/${cajaId}`).then((r) => r.data.data),
  getLowStock: () =>
    api.get('/reportes/stock-bajo').then((r) => r.data.data),
};
