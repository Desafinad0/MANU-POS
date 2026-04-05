import { z } from 'zod';

export const createTableSchema = z.object({
  nombre: z.string().min(1).max(50),
  zona: z.enum(['INTERIOR', 'TERRAZA', 'BARRA']).default('INTERIOR'),
  capacidad: z.number().int().min(1).default(4),
  orden: z.number().int().min(0).default(0),
});

export const updateTableSchema = createTableSchema.partial().extend({
  activo: z.boolean().optional(),
  estado: z.enum(['DISPONIBLE', 'OCUPADA', 'RESERVADA']).optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
