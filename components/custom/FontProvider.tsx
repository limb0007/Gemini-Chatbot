"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Inter, Roboto, Lora, Merriweather, Source_Sans_3 } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400","500","700"] });
const lora = Lora({ subsets: ["latin"] });
const merri = Merriweather({ subsets: ["latin"], weight: ["400", "700"] });
const sourceSans = Source_Sans_3({ subsets: ["latin"] });

type FontKey = "Inter" | "Roboto" | "Lora" | "Merriweather" | "Source Sans 3";
const FONT_MAP: Record<FontKey, string> = {
  Inter: inter.className,
  Roboto: roboto.className,
  Lora: lora.className,
  Merriweather: merri.className,
  "Source Sans 3": sourceSans.className,
};

type Ctx = { font: FontKey; setFont: (f: FontKey) => void; fontClass: string };
const FontCtx = createContext<Ctx | null>(null);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFont] = useState<FontKey>(() => {
    if (typeof window === "undefined") return "Inter";
    return (localStorage.getItem("chat-font") as FontKey) || "Inter";
  });

  useEffect(() => { localStorage.setItem("chat-font", font); }, [font]);

  const value = useMemo(() => ({ font, setFont, fontClass: FONT_MAP[font] }), [font]);

  // 👇 Apply the selected font to the DOM by wrapping children
  return (
    <FontCtx.Provider value={value}>
      <div className={value.fontClass}>{children}</div>
    </FontCtx.Provider>
  );
}

export function useFont() {
  const ctx = useContext(FontCtx);
  if (!ctx) throw new Error("useFont must be used inside <FontProvider>");
  return ctx;
}
