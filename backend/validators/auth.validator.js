import { z } from 'zod';

export const registerSchema = z.object({
  // Accept both 'name' or 'owner_name'
  name: z.string().min(2, 'Name must be at least 2 characters').max(150).optional(),
  owner_name: z.string().min(2, 'Owner name must be at least 2 characters').max(150).optional(),

  // Accept both 'email' or 'owner_email'
  email: z.string().email('Invalid email address').optional(),
  owner_email: z.string().email('Invalid owner email address').optional(),

  // Accept both 'password' or 'owner_password'
  password: z.string().min(6, 'Password must be at least 6 characters').max(100).optional(),
  owner_password: z.string().min(6, 'Password must be at least 6 characters').max(100).optional(),

  // Accept both 'phone' or 'owner_phone'
  phone: z.string().optional(),
  owner_phone: z.string().optional(),

  // Company details
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(150),
  company_email: z.string().email('Invalid company email address').optional(),
  company_phone: z.string().optional(),
  company_address: z.string().optional()
}).refine(data => (data.name || data.owner_name), {
  message: 'User name is required',
  path: ['name']
}).refine(data => (data.email || data.owner_email), {
  message: 'User email is required',
  path: ['email']
}).refine(data => (data.password || data.owner_password), {
  message: 'Password is required',
  path: ['password']
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters')
});

export const googleAuthSchema = z.object({
  id_token: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  name: z.string().optional(),
  google_id: z.string().optional(),
  photo_url: z.string().optional().nullable(),
  company_name: z.string().optional()
}).refine(data => data.id_token || data.email, {
  message: 'Either id_token or email is required for Google authentication',
  path: ['email']
});
