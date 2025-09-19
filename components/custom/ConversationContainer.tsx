
"use client";

import { ReactNode } from "react";
import { useFont } from "@/components/custom/FontProvider"; 

export function ConversationContainer({ children }: { children: ReactNode }) {
  const { fontClass } = useFont();
  return (
    <div className={`${fontClass} text-[17px] md:text-[18px] leading-relaxed`}>
      {children}
    </div>
  );
}
