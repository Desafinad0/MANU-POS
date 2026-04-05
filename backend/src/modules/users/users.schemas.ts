import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(50),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(1, 'Nombre requerido').max(100),
  apellido: z.string().min(1, 'Apellido requerido').max(100),
  telefono: z.string().max(20).optional(),
  pin: z.string().min(4).max(10).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  telefono: z.string().max(20).optional(),
  pin: z.string().min(4).max(10).optional(),
  activo: z.boolean().optional(),
});

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1, 'Al menos un rol requerido'),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
