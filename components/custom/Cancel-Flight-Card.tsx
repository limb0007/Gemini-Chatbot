"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Proposal = {
  requestId: string;
  airline?: string;
  confirmation?: string;
  lastName?: string;
  email?: string;
  from?: string;
  to?: string;
  date?: string;
  reason?: string;
  fee: number;
  policySummary: string;
};

export function CancelFlightCard({
  proposal,
  onSubmitted,
}: {
  proposal: Proposal;
  onSubmitted?: (payload: { cancelRequestId: string }) => void;
}) {
  const [form, setForm] = useState<Proposal>(proposal);
  const [loading, setLoading] = useState(false);

  const set =
    (key: keyof Proposal) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/cancel-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit cancellation");
      toast.success(`Cancellation request submitted (#${data.cancelRequestId})`);
      onSubmitted?.({ cancelRequestId: data.cancelRequestId });
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm max-w-xl">
      <h3 className="font-semibold mb-2">Cancel Flight</h3>
      <p className="text-sm text-muted-foreground mb-4">{form.policySummary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* fields ... unchanged */}
        {/* (keep your inputs exactly as you have them) */}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Estimated fee: <span className="font-medium">${form.fee}</span>
        </div>
        <Button onClick={submit} disabled={loading}>
          {loading ? "Submitting..." : "Submit Cancellation"}
        </Button>
      </div>
    </div>
  );
}
