import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Gets dashboard statistics for bookings',
  inputSchema: z.object({ timezoneOffset: z.number().optional() }),
  outputSchema: z.object({
    totalBookings: z.number(),
    upcomingCount: z.number(),
    completedCount: z.number(),
    totalRevenue: z.number(),
    todayBookings: z.array(z.any()),
  }),
  execute: async ({ input }) => {
    const offsetMs = (input.timezoneOffset ?? 0) * 60 * 1000;
    const nowLocal = new Date(Date.now() - offsetMs);
    const startOfDay = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate()) + offsetMs).toISOString();
    const endOfDay = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() + 1) + offsetMs).toISOString();
    const { rows } = await zite.sql({
      query: `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE "status" = 'Upcoming') as upcoming, COUNT(*) FILTER (WHERE "status" = 'Completed') as completed, COALESCE(SUM("price") FILTER (WHERE "status" = 'Completed'), 0) as revenue FROM "Bookings"`,
    });
    const { records: todayBookings } = await zite.bookings.findAll({
      filters: { sessionStart: { gte: startOfDay } },
      limit: 50,
    });
    const todayFiltered = todayBookings.filter((b) => b.sessionStart && new Date(b.sessionStart as string) < new Date(endOfDay));
    const stats = rows[0] || {};
    return {
      totalBookings: Number(stats.total) || 0,
      upcomingCount: Number(stats.upcoming) || 0,
      completedCount: Number(stats.completed) || 0,
      totalRevenue: Number(stats.revenue) || 0,
      todayBookings: todayFiltered,
    };
  },
});