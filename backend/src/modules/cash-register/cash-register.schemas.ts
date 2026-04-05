import { z } from 'zod';

export const openCashRegisterSchema = z.object({
  fondoInicial: z.number().min(0, 'Fondo inicial debe ser mayor o igual a 0'),
});

export const closeCashRegisterSchema = z.object({
  conteoFisico: z.number().min(0, 'Conteo físico debe ser mayor o igual a 0'),
  observaciones: z.string().optional(),
});

export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
