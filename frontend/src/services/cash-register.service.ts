import api from '../config/api';

export const cashRegisterService = {
  getAll: (params?: any) => api.get('/caja', { params }).then((r) => r.data),
  getCurrent: () => api.get('/caja/actual').then((r) => r.data.data),
  getById: (id: string) => api.get(`/caja/${id}`).then((r) => r.data.data),
  getReport: (id: string) => api.get(`/caja/${id}/reporte`).then((r) => r.data.data),
  open: (fondoInicial: number) => api.post('/caja/abrir', { fondoInicial }).then((r) => r.data.data),
  close: (id: string, conteoFisico: number, observaciones?: string) =>
    api.post(`/caja/${id}/cerrar`, { conteoFisico, observaciones }).then((r) => r.data.data),
};
