import { z } from 'zod';
import { ROLES, MEMBER_STATUS } from '../config/constants.js';

export const updateCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(150).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional()
});

export const addMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Temporary password must be at least 6 characters').max(100),
  phone: z.string().optional().nullable(),
  role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.OFFICER], {
    errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or OFFICER' })
  }).default(ROLES.OFFICER),
  status: z.enum([MEMBER_STATUS.ACTIVE, MEMBER_STATUS.INACTIVE]).optional().default(MEMBER_STATUS.ACTIVE)
});

export const updateMemberSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum([ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OFFICER]).optional(),
  status: z.enum([MEMBER_STATUS.ACTIVE, MEMBER_STATUS.INACTIVE, MEMBER_STATUS.SUSPENDED]).optional()
});
