import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all price adjustments, most recent first',
  inputSchema: z.object({
    search: z.string().optional(),
  }),
  outputSchema: z.object({
    adjustments: z.array(z.object({
      id: z.string(),
      clientName: z.string().nullable(),
      amount: z.number().nullable(),
      reason: z.string().nullable(),
      date: z.string().nullable(),
      createdAt: z.string().nullable(),
    })),
  }),
  execute: async ({ input }) => {
    const filters: Record<string, unknown> = {};
    if (input.search) {
      filters.clientName = { contains: input.search };
    }
    const { records } = await zite.priceAdjustments.findAll({
      filters,
      limit: 200,
    });
    // Sort by createdAt desc
    records.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return {
      adjustments: records.map(r => ({
        id: r.id,
        clientName: r.clientName ?? null,
        amount: r.amount ?? null,
        reason: r.reason ?? null,
        date: r.date ?? null,
        createdAt: r.createdAt ?? null,
      })),
    };
  },
});
