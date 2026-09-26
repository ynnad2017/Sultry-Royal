import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Fetches all bookings with optional status filter',
  inputSchema: z.object({
    status: z.string().optional(),
    search: z.string().optional(),
  }),
  outputSchema: z.object({ bookings: z.array(z.any()) }),
  execute: async ({ input }) => {
    const filters: Record<string, unknown> = {};
    if (input.status) filters.status = input.status;
    if (input.search) filters.clientName = { contains: input.search };
    const { records } = await zite.bookings.findAll({ filters, limit: 500 });
    const sorted = records.sort((a, b) => {
      const aUp = a.status === 'Upcoming' ? 0 : 1;
      const bUp = b.status === 'Upcoming' ? 0 : 1;
      if (aUp !== bUp) return aUp - bUp;
      const da = a.sessionStart ? new Date(a.sessionStart as string).getTime() : 0;
      const db = b.sessionStart ? new Date(b.sessionStart as string).getTime() : 0;
      return aUp === 0 ? da - db : db - da;
    });
    return { bookings: sorted };
  },
});