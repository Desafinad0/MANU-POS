import api from '../config/api';

export interface Mesa {
  id: string;
  nombre: string;
  zona: 'INTERIOR' | 'TERRAZA' | 'BARRA' | 'PRIVADO';
  capacidad: number;
  estado: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA';
  activo: boolean;
  orden: number;
  _count?: { ordenes: number };
}

export interface CreateMesaInput {
  nombre: string;
  zona?: string;
  capacidad?: number;
  orden?: number;
}

export interface UpdateMesaInput extends Partial<CreateMesaInput> {
  activo?: boolean;
}

export const tablesService = {
  getAll: (params?: { zona?: string; estado?: string; activo?: string }) =>
    api.get('/mesas', { params }).then((r) => r.data.data),
  getById: (id: string) =>
    api.get(`/mesas/${id}`).then((r) => r.data.data),
  create: (data: CreateMesaInput) =>
    api.post('/mesas', data).then((r) => r.data.data),
  update: (id: string, data: UpdateMesaInput) =>
    api.put(`/mesas/${id}`, data).then((r) => r.data.data),
  remove: (id: string) =>
    api.delete(`/mesas/${id}`).then((r) => r.data),
  updateEstado: (id: string, estado: string) =>
    api.patch(`/mesas/${id}/estado`, { estado }).then((r) => r.data.data),
};
