
import { tool } from "ai";
import { z } from "zod";

export const cancelFlightTool = tool({
  description:
    "Prepare a flight cancellation request from a user's message. Extract airline, date, route, confirmation code, and passenger details if present.",
  parameters: z.object({
    airline: z.string().optional(),
    confirmation: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    date: z.string().optional().describe('Date like "2025-10-04" or "next week"'),
    reason: z.string().optional(),
  }),
  // Return a proposal the UI can render/edit before submitting
  execute: async (args) => {
    // naive mock policy / fees
    const fee = 75; // USD
    const proposal = {
      requestId: crypto.randomUUID(),
      ...args,
      fee,
      policySummary:
        "Most economy tickets charge a $75 cancellation fee; refund depends on fare rules.",
    };
    return { type: "cancelFlight.proposal", proposal };
  },
});
