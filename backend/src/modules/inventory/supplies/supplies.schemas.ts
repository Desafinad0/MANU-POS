import { z } from 'zod';

export const createSupplySchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200),
  sku: z.string().min(1, 'SKU es requerido').max(50),
  unidadMedida: z.enum(['KG', 'LT', 'PZA', 'ML', 'GR'], {
    errorMap: () => ({ message: 'Unidad de medida debe ser KG, LT, PZA, ML o GR' }),
  }),
  descripcion: z.string().max(500).optional(),
  costoPromedio: z.number().min(0).optional(),
  ultimoCosto: z.number().min(0).optional(),
  nivelMinimo: z.number().min(0).optional(),
  nivelMaximo: z.number().min(0).optional(),
  perecedero: z.boolean().optional(),
});

export const updateSupplySchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  sku: z.string().min(1).max(50).optional(),
  unidadMedida: z.enum(['KG', 'LT', 'PZA', 'ML', 'GR']).optional(),
  descripcion: z.string().max(500).optional().nullable(),
  costoPromedio: z.number().min(0).optional(),
  ultimoCosto: z.number().min(0).optional(),
  nivelMinimo: z.number().min(0).optional(),
  nivelMaximo: z.number().min(0).optional(),
  perecedero: z.boolean().optional(),
});

export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
export type UpdateSupplyInput = z.infer<typeof updateSupplySchema>;
