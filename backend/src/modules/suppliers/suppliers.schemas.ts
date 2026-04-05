import { z } from 'zod';

export const createSupplierSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200),
  contacto: z.string().max(200).optional(),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  notas: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();
