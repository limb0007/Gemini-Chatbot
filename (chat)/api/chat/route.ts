// app/(chat)/api/chat/route.ts
import { convertToCoreMessages, Message, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { geminiFlashModel } from "@/ai";
import {
  generateReservationPrice,
  generateSampleFlightSearchResults,
  generateSampleFlightStatus,
  generateSampleSeatSelection,
} from "@/ai/actions";
import { auth } from "@/app/(auth)/auth";
import {
  createReservation,
  deleteChatById,
  getChatById,
  getReservationById,
  getReservationsByUserId,
  saveChat,
} from "@/db/queries";
import { generateUUID } from "@/lib/utils";

// ---------- POST /api/chat ----------
export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const coreMessages = convertToCoreMessages(messages).filter(
    (m) => m.content.length > 0,
  );

  const systemPrompt = `\
- you help users book flights!
- keep your responses limited to a sentence.
- DO NOT output lists.
- after every tool call, pretend you're showing the result to the user and keep your response limited to a phrase.
- today's date is ${new Date().toLocaleDateString()}.
- ask follow up questions to nudge user into the optimal flow
- ask for any details you don't know, like name of passenger, etc.
- C and D are aisle seats, A and F are window seats, B and E are middle seats
- assume the most popular airports for the origin and destination
- if the user asks to cancel a flight, call cancelFlight
- if the user asks to see purchased tickets (e.g. "show all tickets I bought"), call listTickets
- here's the optimal flow
  - search for flights
  - choose flight
  - select seats
  - create reservation (ask user whether to proceed with payment or change reservation)
  - authorize payment (requires user consent, wait for user to finish payment and let you know when done)
  - display boarding pass (DO NOT display boarding pass without verifying payment)
`;

  const onFinishHandler = async ({ responseMessages }: { responseMessages: any }) => {
    if (session.user?.id) {
      try {
        await saveChat({
          id,
          messages: [...coreMessages, ...responseMessages],
          userId: session.user.id,
        });
      } catch {
        console.error("Failed to save chat");
      }
    }
  };

  const tools = {
    // ---- Cancel flight tool: returns a proposal the client renders with <CancelFlightCard /> ----
    cancelFlight: {
      description:
        "Prepare a flight cancellation request. Extract airline, confirmation code, passenger details, route, and date from user input.",
      parameters: z.object({
        airline: z.string().optional(),
        confirmation: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        date: z
          .string()
          .optional()
          .describe('Date like "2025-10-04" or a phrase like "next week"'),
        reason: z.string().optional(),
      }),
      execute: async (args: any) => {
        const proposal = {
          requestId: generateUUID(),
          fee: 75,
          policySummary:
            "Most economy fares have a $75 cancellation fee; refund depends on fare rules.",
          ...args,
        };
        return { type: "cancelFlight.proposal", proposal };
      },
    },

    // ---- List purchased tickets for the signed-in user ----
    listTickets: {
      description:
        "Show all purchased tickets for the signed-in user. Optionally filter for upcoming only.",
      parameters: z.object({
        onlyUpcoming: z.boolean().optional().default(true),
      }),
      execute: async ({ onlyUpcoming }: { onlyUpcoming?: boolean }) => {
        const session = await auth();
        if (!session?.user?.id) return { error: "User not signed in." };

        const rows = await getReservationsByUserId({ userId: session.user.id });
        const now = new Date();

        const tickets = (rows || [])
          .map((r: any) => {
            const raw = r.details;
            const d =
              typeof raw === "string"
                ? safeParseJSON(raw)
                : raw || {};
            return {
              id: r.id,
              hasCompletedPayment: !!r.hasCompletedPayment,
              totalPriceInUSD: d.totalPriceInUSD,
              passengerName: d.passengerName,
              flightNumber: d.flightNumber,
              seats: d.seats,
              departure: d.departure, // { cityName, airportCode, timestamp }
              arrival: d.arrival, // { cityName, airportCode, timestamp }
            };
          })
          .filter((t: any) =>
            onlyUpcoming === false
              ? true
              : t?.departure?.timestamp
              ? new Date(t.departure.timestamp) >= now
              : true,
          );

        return { type: "tickets.list", tickets };
      },
    },

    // ---- Sample tools already in your app ----
    getWeather: {
      description: "Get the current weather at a location",
      parameters: z.object({
        latitude: z.number().describe("Latitude coordinate"),
        longitude: z.number().describe("Longitude coordinate"),
      }),
      execute: async ({ latitude, longitude }: any) => {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
        );
        return await response.json();
      },
    },

    displayFlightStatus: {
      description: "Display the status of a flight",
      parameters: z.object({
        flightNumber: z.string().describe("Flight number"),
        date: z.string().describe("Date of the flight"),
      }),
      execute: async ({ flightNumber, date }: any) => {
        return await generateSampleFlightStatus({ flightNumber, date });
      },
    },

    searchFlights: {
      description: "Search for flights based on the given parameters",
      parameters: z.object({
        origin: z.string().describe("Origin airport or city"),
        destination: z.string().describe("Destination airport or city"),
      }),
      execute: async ({ origin, destination }: any) => {
        return await generateSampleFlightSearchResults({ origin, destination });
      },
    },

    selectSeats: {
      description: "Select seats for a flight",
      parameters: z.object({
        flightNumber: z.string().describe("Flight number"),
      }),
      execute: async ({ flightNumber }: any) => {
        return await generateSampleSeatSelection({ flightNumber });
      },
    },

    createReservation: {
      description: "Display pending reservation details",
      parameters: z.object({
        seats: z.array(z.string()).describe("Array of selected seat numbers"),
        flightNumber: z.string().describe("Flight number"),
        departure: z.object({
          cityName: z.string().describe("Name of the departure city"),
          airportCode: z.string().describe("Code of the departure airport"),
          timestamp: z.string().describe("ISO 8601 date of departure"),
          gate: z.string().describe("Departure gate"),
          terminal: z.string().describe("Departure terminal"),
        }),
        arrival: z.object({
          cityName: z.string().describe("Name of the arrival city"),
          airportCode: z.string().describe("Code of the arrival airport"),
          timestamp: z.string().describe("ISO 8601 date of arrival"),
          gate: z.string().describe("Arrival gate"),
          terminal: z.string().describe("Arrival terminal"),
        }),
        passengerName: z.string().describe("Name of the passenger"),
      }),
      execute: async (props: any) => {
        const { totalPriceInUSD } = await generateReservationPrice(props);
        const session = await auth();
        const reservationId = generateUUID();

        if (session?.user?.id) {
          await createReservation({
            id: reservationId,
            userId: session.user.id,
            details: { ...props, totalPriceInUSD },
          });
          return { id: reservationId, ...props, totalPriceInUSD };
        }
        return { error: "User is not signed in to perform this action!" };
      },
    },

    authorizePayment: {
      description:
        "User will enter credentials to authorize payment, wait for user to respond when they are done",
      parameters: z.object({
        reservationId: z
          .string()
          .describe("Unique identifier for the reservation"),
      }),
      execute: async ({ reservationId }: any) => {
        return { reservationId };
      },
    },

    verifyPayment: {
      description: "Verify payment status",
      parameters: z.object({
        reservationId: z
          .string()
          .describe("Unique identifier for the reservation"),
      }),
      execute: async ({ reservationId }: any) => {
        const r = await getReservationById({ id: reservationId });
        return { hasCompletedPayment: !!r?.hasCompletedPayment };
      },
    },

    displayBoardingPass: {
      description: "Display a boarding pass",
      parameters: z.object({
        reservationId: z.string().describe("Reservation ID"),
        passengerName: z.string().describe("Passenger name, title case"),
        flightNumber: z.string().describe("Flight number"),
        seat: z.string().describe("Seat number"),
        departure: z.object({
          cityName: z.string(),
          airportCode: z.string(),
          airportName: z.string(),
          timestamp: z.string(),
          terminal: z.string(),
          gate: z.string(),
        }),
        arrival: z.object({
          cityName: z.string(),
          airportCode: z.string(),
          airportName: z.string(),
          timestamp: z.string(),
          terminal: z.string(),
          gate: z.string(),
        }),
      }),
      execute: async (boardingPass: any) => boardingPass,
    },
  } as const;

  // --- Primary attempt (Gemini Flash via your wrapped model) ---
  try {
    const result = await streamText({
      model: geminiFlashModel,
      system: systemPrompt,
      messages: coreMessages,
      tools,
      maxTokens: 200, // ✅ correct option name
      onFinish: onFinishHandler,
      experimental_telemetry: { isEnabled: true, functionId: "stream-text" },
    });

    return result.toDataStreamResponse({});
  } catch (err) {
    console.error("Primary model failed:", err);
  }

  // --- Fallback: use a plain, lightweight model instance and fewer tokens ---
  try {
    const flashLatest = google("gemini-1.5-flash-latest");
   

    const fallback = await streamText({
      model: flashLatest,
      system: systemPrompt,
    
      tools,
      maxTokens: 200, // ✅ correct option name
      onFinish: onFinishHandler,
      experimental_telemetry: { isEnabled: true, functionId: "stream-text" },
    });

    return fallback.toDataStreamResponse({});
  } catch (err2) {
    console.error("Fallback also failed:", err2);
    // Friendly error for the UI
    return new Response(
      JSON.stringify({
        error:
          "Model quota exceeded. Please reduce message length or try a lighter query.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ---------- DELETE /api/chat ----------
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return new Response("Not Found", { status: 404 });

  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  try {
    const chat = await getChatById({ id });
    if (!chat || chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    await deleteChatById({ id });
    return new Response("Chat deleted", { status: 200 });
  } catch {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}

// ---------- helpers ----------
function safeParseJSON(v: unknown) {
  if (typeof v !== "string") return v ?? {};
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}
