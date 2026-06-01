import { ConvexHttpClient } from "convex/browser"

export function getConvexHttpClient() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  if (!convexUrl) {
    throw new Error("Missing VITE_CONVEX_URL. Run Convex dev setup before starting web.")
  }

  return new ConvexHttpClient(convexUrl)
}
