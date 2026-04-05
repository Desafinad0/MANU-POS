import { z } from 'zod';

export const createCategorySchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(100),
  descripcion: z.string().max(500).optional(),
  imagen: z.string().max(500).optional(),
  orden: z.number().int().min(0).optional(),
  categoriaPadreId: z.string().uuid('ID de categoría padre inválido').optional().nullable(),
});

export const updateCategorySchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(100).optional(),
  descripcion: z.string().max(500).optional().nullable(),
  imagen: z.string().max(500).optional().nullable(),
  orden: z.number().int().min(0).optional(),
  categoriaPadreId: z.string().uuid('ID de categoría padre inválido').optional().nullable(),
});

export const updateOrderSchema = z.object({
  orden: z.number().int().min(0, 'Orden debe ser un número positivo'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
