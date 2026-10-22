import { z } from 'zod';

export const createTripSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),

  start_location: z.string().optional(),
  origin: z.string().optional(),

  start_latitude: z.number().optional().nullable(),
  start_longitude: z.number().optional().nullable(),

  destination: z.string().min(2, 'Destination is required').max(200),
  destination_latitude: z.number().optional().nullable(),
  destination_longitude: z.number().optional().nullable(),

  start_at: z.string().optional(),
  start_date: z.string().optional(),

  end_at: z.string().optional(),
  end_date: z.string().optional(),

  initial_balance: z.number().min(0).optional(),
  allocated_budget: z.number().min(0).optional(),

  officer_id: z.string().optional().nullable(),
  officer_ids: z.array(z.string()).optional()
}).refine(data => data.start_location || data.origin, {
  message: 'Start location (or origin) is required',
  path: ['start_location']
}).refine(data => data.start_at || data.start_date, {
  message: 'Start date is required',
  path: ['start_at']
}).refine(data => data.end_at || data.end_date, {
  message: 'End date is required',
  path: ['end_at']
});

export const updateTripSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  start_location: z.string().optional(),
  origin: z.string().optional(),
  start_latitude: z.number().optional().nullable(),
  start_longitude: z.number().optional().nullable(),
  destination: z.string().min(2).max(200).optional(),
  destination_latitude: z.number().optional().nullable(),
  destination_longitude: z.number().optional().nullable(),
  start_at: z.string().optional(),
  start_date: z.string().optional(),
  end_at: z.string().optional(),
  end_date: z.string().optional(),
  initial_balance: z.number().min(0).optional(),
  allocated_budget: z.number().min(0).optional(),
  officer_id: z.string().optional().nullable()
});

export const assignOfficerSchema = z.object({
  officer_id: z.string({ required_error: 'Officer ID is required' }).min(1)
});

export const updateTripStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'SCHEDULED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'ASSIGNED',
    'IN_PROGRESS'
  ], {
    errorMap: () => ({ message: 'Invalid status. Allowed: DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELLED' })
  })
});
