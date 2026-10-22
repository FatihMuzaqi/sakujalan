import { z } from 'zod';

export const checkoutSubscriptionSchema = z.object({
  payment_method: z.string().optional().default('QRIS'),
  gateway: z.enum(['MIDTRANS', 'XENDIT', 'SIMULATOR']).optional().default('SIMULATOR')
});
