import { z } from 'zod';

export const createMovementSchema = z.object({
  insumoId: z.string().uuid('ID de insumo inválido'),
  tipoMovimiento: z.enum([
    'COMPRA',
    'MERMA',
    'AJUSTE_POSITIVO',
    'AJUSTE_NEGATIVO',
    'CONSUMO_INTERNO',
    'INVENTARIO_INICIAL',
  ], {
    errorMap: () => ({ message: 'Tipo de movimiento inválido' }),
  }),
  cantidad: z.number().positive('Cantidad debe ser positiva'),
  costoUnitario: z.number().min(0).optional(),
  almacenDestinoId: z.string().uuid('ID de almacén destino inválido').optional(),
  almacenOrigenId: z.string().uuid('ID de almacén origen inválido').optional(),
  notas: z.string().max(500).optional(),
  referencia: z.string().max(100).optional(),
  proveedorId: z.string().uuid('ID de proveedor inválido').optional(),
  fecha: z.string().optional(),
});

export const transferSchema = z.object({
  insumoId: z.string().uuid('ID de insumo inválido'),
  cantidad: z.number().positive('Cantidad debe ser positiva'),
  almacenOrigenId: z.string().uuid('ID de almacén origen inválido'),
  almacenDestinoId: z.string().uuid('ID de almacén destino inválido'),
  notas: z.string().max(500).optional(),
});

export const createPurchaseSchema = z.object({
  proveedorId: z.string().uuid('ID de proveedor inválido').optional(),
  almacenDestinoId: z.string().uuid('ID de almacén destino inválido'),
  fecha: z.string().optional(),
  notas: z.string().max(500).optional(),
  partidas: z.array(z.object({
    insumoId: z.string().uuid('ID de insumo inválido'),
    cantidad: z.number().positive('Cantidad debe ser positiva'),
    costoUnitario: z.number().min(0, 'Costo debe ser >= 0'),
  })).min(1, 'Debe incluir al menos una partida'),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
