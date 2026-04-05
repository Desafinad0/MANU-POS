import api from '../config/api';

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  orden: number;
  subcategorias?: Category[];
}

export interface ProductVariant {
  id: string;
  nombre: string;
  tipo: string;
  precioExtra: number;
}

export interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  sku: string;
  precio: number;
  costoCalculado?: number;
  imagen?: string;
  tipoOrden: 'COCINA' | 'BARRA';
  disponible: boolean;
  categoriaId: string;
  categoria?: Category;
  variantes?: ProductVariant[];
}

export const catalogService = {
  // Categories
  getCategories: () => api.get('/categorias').then((r) => r.data.data),
  createCategory: (data: Partial<Category>) => api.post('/categorias', data).then((r) => r.data.data),
  updateCategory: (id: string, data: Partial<Category>) => api.put(`/categorias/${id}`, data).then((r) => r.data.data),
  deleteCategory: (id: string) => api.delete(`/categorias/${id}`),

  // Products
  getProducts: (params?: { page?: number; limit?: number; search?: string; categoriaId?: string }) =>
    api.get('/productos', { params }).then((r) => r.data),
  getProductsForPOS: () => api.get('/productos/pos').then((r) => r.data.data),
  getProduct: (id: string) => api.get(`/productos/${id}`).then((r) => r.data.data),
  createProduct: (data: any) => api.post('/productos', data).then((r) => r.data.data),
  updateProduct: (id: string, data: any) => api.put(`/productos/${id}`, data).then((r) => r.data.data),
  toggleAvailability: (id: string) => api.patch(`/productos/${id}/disponibilidad`).then((r) => r.data.data),
  deleteProduct: (id: string) => api.delete(`/productos/${id}`),

  // Variants
  addVariant: (productoId: string, data: any) => api.post(`/productos/${productoId}/variantes`, data).then((r) => r.data.data),
  updateVariant: (productoId: string, varianteId: string, data: any) => api.put(`/productos/${productoId}/variantes/${varianteId}`, data).then((r) => r.data.data),
  deleteVariant: (productoId: string, varianteId: string) => api.delete(`/productos/${productoId}/variantes/${varianteId}`),
};
