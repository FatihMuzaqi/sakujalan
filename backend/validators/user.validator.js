import { z } from 'zod';
import { ROLES } from '../config/constants.js';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  phone: z.string().optional(),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.OFFICER], {
    errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or OFFICER' })
  })
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  phone: z.string().optional(),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.OFFICER]).optional(),
  is_active: z.boolean().optional()
});
