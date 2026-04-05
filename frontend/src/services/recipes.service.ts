import api from '../config/api';

export interface RecipeDetail {
  id?: string;
  insumoId: string;
  cantidad: number;
  merma: number;
  insumo?: {
    id: string;
    nombre: string;
    unidadMedida: string;
    costoPromedio: number;
  };
}

export interface Recipe {
  id: string;
  productoId: string;
  rendimiento: number;
  notas?: string;
  costoCalculado: number;
  detalles: RecipeDetail[];
}

export interface CreateRecipeInput {
  productoId: string;
  rendimiento?: number;
  notas?: string;
  detalles: { insumoId: string; cantidad: number; merma?: number }[];
}

export const recipesService = {
  getByProduct: (productoId: string) =>
    api.get(`/recetas/producto/${productoId}`).then((r) => r.data.data),
  createOrUpdate: (data: CreateRecipeInput) =>
    api.post('/recetas', data).then((r) => r.data.data),
  calculateCost: (id: string) =>
    api.get(`/recetas/${id}/costo`).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/recetas/${id}`),
};
