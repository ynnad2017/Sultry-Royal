import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

const PRICES: Record<string, number> = {
  'Swedish Massage — \u20ac100': 100,
  'Deep Tissue Massage — \u20ac150': 150,
  'Swedish Deep Tensions — \u20ac180': 180,
  'Breath Massage — \u20ac250': 250,
  'Massage Extra — \u20ac50': 50,
};

export default createEndpoint({
  description: 'Creates a new booking appointment',
  inputSchema: z.object({
    clientName: z.string().min(1),
    phoneNumber: z.string().min(1),
    massageType: z.string(),
    sessionStart: z.string(),
    sessionEnd: z.string().optional(),
    notes: z.string().optional(),
    paymentMethod: z.string().optional(),
    durationHours: z.number().optional(),
    extraService: z.number().optional(),
  }),
  outputSchema: z.object({ booking: z.any() }),
  execute: async ({ input }) => {
    const { records: existing } = await zite.bookings.findAll({
      filters: { clientName: input.clientName, status: 'Completed' },
    });
    const booking = await zite.bookings.create({
      record: {
        clientName: input.clientName,
        phoneNumber: input.phoneNumber,
        massageType: input.massageType,
        price: (PRICES[input.massageType] ?? 0) + (input.extraService ?? 0),
        extraService: input.extraService ?? null,
        sessionStart: input.sessionStart,
        sessionEnd: input.sessionEnd,
        status: 'Upcoming',
        visitCount: existing.length + 1,
        notes: input.notes ?? null,
        paymentMethod: input.paymentMethod ?? null,
        durationHours: input.durationHours ?? null,
        reminder1DaySent: false,
        reminder3HoursSent: false,
        reminder1HourSent: false,
      },
    });
    return { booking };
  },
});