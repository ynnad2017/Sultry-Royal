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
  description: 'Updates an existing booking',
  inputSchema: z.object({
    id: z.string(),
    clientName: z.string().optional(),
    phoneNumber: z.string().optional(),
    massageType: z.string().optional(),
    sessionStart: z.string().optional(),
    sessionEnd: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    paymentMethod: z.string().optional(),
    durationHours: z.number().optional(),
    extraService: z.number().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    const record: Record<string, unknown> = {};
    if (input.clientName !== undefined) record.clientName = input.clientName;
    if (input.phoneNumber !== undefined) record.phoneNumber = input.phoneNumber;
    if (input.massageType !== undefined) {
      record.massageType = input.massageType;
      record.price = (PRICES[input.massageType] ?? 0) + (input.extraService ?? 0);
    }
    if (input.extraService !== undefined) {
      record.extraService = input.extraService;
      if (input.massageType === undefined) {
        const existing = await zite.bookings.findOne({ id: input.id });
        record.price = (PRICES[existing?.massageType as string] ?? 0) + input.extraService;
      }
    }
    if (input.sessionStart !== undefined) record.sessionStart = input.sessionStart;
    if (input.sessionEnd !== undefined) record.sessionEnd = input.sessionEnd;
    if (input.status !== undefined) record.status = input.status;
    if (input.notes !== undefined) record.notes = input.notes;
    if (input.paymentMethod !== undefined) record.paymentMethod = input.paymentMethod;
    if (input.durationHours !== undefined) record.durationHours = input.durationHours;
    await zite.bookings.update({ id: input.id, record });
    return { success: true };
  },
});