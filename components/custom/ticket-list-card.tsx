"use client";

type Ticket = {
  id: string;
  hasCompletedPayment?: boolean;
  totalPriceInUSD?: number;
  passengerName?: string;
  flightNumber: string;
  seats?: string[] | string;
  departure: { cityName: string; airportCode: string; timestamp: string };
  arrival:   { cityName: string; airportCode: string; timestamp: string };
};

export default function TicketListCard({ tickets }: { tickets: Ticket[] }) {
  if (!tickets?.length) {
    return (
      <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm max-w-3xl">
        <h3 className="font-semibold mb-2">Your tickets</h3>
        <p className="text-sm text-muted-foreground">No tickets found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm w-full max-w-3xl">
      <h3 className="font-semibold mb-3">Your tickets</h3>
      <ul className="space-y-3">
        {tickets.map((t) => {
          const seats = Array.isArray(t.seats) ? t.seats.join(", ") : (t.seats ?? "—");
          const dep = new Date(t.departure.timestamp);
          const arr = new Date(t.arrival.timestamp);
          return (
            <li key={t.id} className="rounded-lg border bg-background p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="grow">
                <div className="text-sm font-medium">
                  {t.departure.cityName} ({t.departure.airportCode}) → {t.arrival.cityName} ({t.arrival.airportCode})
                </div>
                <div className="text-xs text-muted-foreground">
                  {dep.toLocaleString()} → {arr.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Flight <span className="font-medium">{t.flightNumber}</span> • Seats: {seats} • Passenger: {t.passengerName ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  t.hasCompletedPayment ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10"
                }`}>
                  {t.hasCompletedPayment ? "Paid" : "Pending"}
                </span>
                {t.totalPriceInUSD != null && (
                  <span className="text-sm font-medium">${t.totalPriceInUSD.toFixed(2)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
