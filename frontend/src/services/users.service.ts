import api from '../config/api';

export interface User {
  id: string;
  nombre: string;
  email: string;
  username: string;
  pin?: string;
  activo: boolean;
  roles: Role[];
  creadoEn: string;
}

export interface Role {
  id: string;
  nombre: string;
  descripcion?: string;
  permisos: string[];
}

export interface CreateUserInput {
  nombre: string;
  email: string;
  username: string;
  password: string;
  pin?: string;
  roleIds: string[];
}

export interface UpdateUserInput {
  nombre?: string;
  email?: string;
  username?: string;
  password?: string;
  pin?: string;
  activo?: boolean;
}

export const usersService = {
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/usuarios', { params }).then((r) => r.data),
  getUser: (id: string) => api.get(`/usuarios/${id}`).then((r) => r.data.data),
  createUser: (data: CreateUserInput) => api.post('/usuarios', data).then((r) => r.data.data),
  updateUser: (id: string, data: UpdateUserInput) => api.put(`/usuarios/${id}`, data).then((r) => r.data.data),
  deleteUser: (id: string) => api.delete(`/usuarios/${id}`),
  getRoles: () => api.get('/usuarios/roles').then((r) => r.data.data),
  assignRoles: (id: string, roleIds: string[]) =>
    api.patch(`/usuarios/${id}/roles`, { roleIds }).then((r) => r.data.data),
};
