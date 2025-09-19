import { google } from "@ai-sdk/google";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { customMiddleware } from "./custom-middleware";

// use flash everywhere (lighter, cheaper)
export const geminiProModel = wrapLanguageModel({
  model: google("gemini-1.5-pro-latest"),
  middleware: customMiddleware,
});

export const geminiFlashModel = wrapLanguageModel({
  model: google("gemini-1.5-flash-latest"),
  middleware: customMiddleware,
});
