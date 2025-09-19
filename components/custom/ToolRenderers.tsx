"use client";
import { CancelFlightCard } from "@/components/custom/Cancel-Flight-Card";

export function RenderToolInvocation({
  invocation,
  onSubmitted,
}: {
  invocation: any; // from message.toolInvocations[i]
  onSubmitted?: (res: { cancelRequestId: string }) => void;
}) {
  if (invocation.toolName === "cancelFlight" && invocation.state === "result") {
    const result = invocation.result; // { type: 'cancelFlight.proposal', proposal: {...} }
    if (result?.type === "cancelFlight.proposal") {
      return <CancelFlightCard proposal={result.proposal} onSubmitted={onSubmitted} />;
    }
  }
  return null;
}
