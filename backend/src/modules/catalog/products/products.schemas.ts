import { z } from 'zod';

export const createProductSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200),
  sku: z.string().min(1, 'SKU es requerido').max(50),
  precio: z.number().positive('Precio debe ser mayor a 0'),
  categoriaId: z.string().uuid('ID de categoría inválido'),
  tipoOrden: z.enum(['COCINA', 'BARRA']).optional(),
  descripcion: z.string().max(1000).optional(),
  imagen: z.string().max(500).optional(),
});

export const updateProductSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200).optional(),
  sku: z.string().min(1, 'SKU es requerido').max(50).optional(),
  precio: z.number().positive('Precio debe ser mayor a 0').optional(),
  categoriaId: z.string().uuid('ID de categoría inválido').optional(),
  tipoOrden: z.enum(['COCINA', 'BARRA']).optional().nullable(),
  descripcion: z.string().max(1000).optional().nullable(),
  imagen: z.string().max(500).optional().nullable(),
});

export const createVariantSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(100),
  tipo: z.string().min(1, 'Tipo es requerido').max(50),
  precioExtra: z.number().min(0, 'Precio extra debe ser mayor o igual a 0'),
});

export const updateVariantSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  tipo: z.string().min(1).max(50).optional(),
  precioExtra: z.number().min(0).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
