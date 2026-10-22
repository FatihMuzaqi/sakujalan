import { z } from 'zod';

export const logLocationSchema = z.object({
  trip_id: z.string().uuid('Invalid trip ID'),
  user_id: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  accuracy: z.number().nullable().optional(),
  battery_level: z.number().min(0).max(100).nullable().optional(),
  recorded_at: z.string().refine((val) => !isNaN(Date.parse(val))).optional()
});

export const batchLocationSchema = z.object({
  trip_id: z.string().uuid('Invalid trip ID'),
  locations: z.array(z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speed: z.number().nullable().optional(),
    heading: z.number().min(0).max(360).nullable().optional(),
    accuracy: z.number().nullable().optional(),
    battery_level: z.number().min(0).max(100).nullable().optional(),
    recorded_at: z.string().refine((val) => !isNaN(Date.parse(val))).optional()
  })).min(1, 'At least one location entry is required')
});
