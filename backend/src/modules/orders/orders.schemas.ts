import { z } from 'zod';

const orderItemSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().min(1),
  varianteIds: z.array(z.string().uuid()).optional(),
  notas: z.string().optional(),
  comensal: z.number().int().min(1).optional().default(1),
});

export const createOrderSchema = z.object({
  tipoServicio: z.enum(['MESA', 'PARA_LLEVAR', 'PLATAFORMA']),
  mesaId: z.string().uuid().optional(),
  comensales: z.number().int().min(1).optional().default(1),
  clienteNombre: z.string().max(200).optional(),
  clienteTelefono: z.string().max(20).optional(),
  plataforma: z.string().max(50).optional(),
  notas: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
}).refine(
  (data) => data.tipoServicio !== 'MESA' || !!data.mesaId,
  { message: 'Mesa es requerida para servicio en mesa', path: ['mesaId'] }
);

export const addItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1),
});

export const payOrderSchema = z.object({
  metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO']),
  montoPagado: z.number().min(0),
  descuento: z.number().min(0).optional().default(0),
  notas: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  motivoCancelacion: z.string().min(1, 'Motivo de cancelacion requerido'),
});

export const updateItemStatusSchema = z.object({
  estado: z.enum(['PREPARANDO', 'LISTO', 'ENTREGADO']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddItemsInput = z.infer<typeof addItemsSchema>;
export type PayOrderInput = z.infer<typeof payOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
