import { z } from 'zod';

export const recipeDetailSchema = z.object({
  insumoId: z.string().uuid('ID de insumo inválido'),
  cantidad: z.number().positive('Cantidad debe ser mayor a 0'),
  merma: z.number().min(0).default(0),
});

export const createRecipeSchema = z.object({
  productoId: z.string().uuid('ID de producto inválido'),
  rendimiento: z.number().positive().default(1),
  notas: z.string().max(1000).optional(),
  detalles: z.array(recipeDetailSchema).min(1, 'Debe incluir al menos un detalle'),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type RecipeDetailInput = z.infer<typeof recipeDetailSchema>;
