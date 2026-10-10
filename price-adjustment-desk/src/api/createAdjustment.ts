import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Creates a new price adjustment for a client',
  inputSchema: z.object({
    clientName: z.string().min(1),
    amount: z.number().positive(),
    reason: z.string().optional(),
    date: z.string(),
  }),
  outputSchema: z.object({
    id: z.string(),
  }),
  execute: async ({ input, context }) => {
    const record = await zite.priceAdjustments.create({
      record: {
        clientName: input.clientName,
        amount: input.amount,
        reason: input.reason ?? null,
        date: input.date,
        addedBy: context.user.id,
      },
    });
    return { id: record.id };
  },
});
