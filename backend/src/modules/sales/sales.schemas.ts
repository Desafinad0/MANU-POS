import { z } from 'zod';

const saleItemSchema = z.object({
  productoId: z.string().uuid('ID de producto inválido'),
  cantidad: z.number().int().min(1, 'Cantidad mínima es 1'),
  varianteIds: z.array(z.string().uuid()).optional(),
  notas: z.string().optional(),
  comensal: z.number().int().min(1).optional().default(1),
});

export const createSaleSchema = z.object({
  tipoServicio: z.enum(['MESA', 'PARA_LLEVAR', 'PLATAFORMA']),
  mesa: z.string().optional(),
  plataforma: z.string().optional(),
  clienteNombre: z.string().optional(),
  clienteTelefono: z.string().optional(),
  metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO']),
  montoPagado: z.number().min(0, 'Monto pagado debe ser mayor o igual a 0'),
  descuento: z.number().min(0).optional().default(0),
  comensales: z.number().int().min(1).optional().default(1),
  notas: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'Debe incluir al menos un producto'),
}).refine(
  (data) => {
    if (data.tipoServicio === 'MESA' && !data.mesa) return false;
    return true;
  },
  { message: 'Mesa es requerida para servicio en mesa', path: ['mesa'] }
).refine(
  (data) => {
    if (data.tipoServicio === 'PLATAFORMA' && !data.plataforma) return false;
    return true;
  },
  { message: 'Plataforma es requerida para servicio de plataforma', path: ['plataforma'] }
);

export const cancelSaleSchema = z.object({
  motivoCancelacion: z.string().min(1, 'Motivo de cancelación requerido'),
});

export const updateItemStatusSchema = z.object({
  estado: z.enum(['PENDIENTE', 'PREPARANDO', 'LISTO', 'ENTREGADO']),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
