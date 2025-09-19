// components/FontSelector.tsx
"use client";
import { useFont } from "@/components/custom/FontProvider";
const OPTIONS = ["Inter","Roboto","Lora","Merriweather","Source Sans 3"] as const;

export default function FontSelector() {
  const { font, setFont } = useFont();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span>Font</span>
      <select
        className="rounded-md border px-2 py-1"
        value={font}
        onChange={(e) => setFont(e.target.value as (typeof OPTIONS)[number])}
      >
        {OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
  );
}
