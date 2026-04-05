import { z } from 'zod';

export const createWarehouseSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(100),
  descripcion: z.string().max(500).optional(),
});

export const updateWarehouseSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().max(500).optional().nullable(),
  activo: z.boolean().optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
