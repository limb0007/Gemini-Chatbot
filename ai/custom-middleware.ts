import { Experimental_LanguageModelV1Middleware } from "ai";
// import { authConfig } from "./auth.config.ts"; // Removed or update the path if the file exists elsewhere
export const customMiddleware: Experimental_LanguageModelV1Middleware = {};
export { auth as middleware } from "@/app/(auth)/auth"; // Adjust the path as necessary // Adjust the path as necessary
export { authConfig } from "@/app/(auth)/auth.config";

