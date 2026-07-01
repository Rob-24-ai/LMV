import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN access to the dev server (e.g. from a phone) via the Mac's
  // Bonjour hostname. Without this, Next 16 blocks internal dev endpoints
  // (HMR websocket) for any non-localhost Origin, which silently stalls
  // hydration — the page renders SSR "Loading…" and never becomes interactive.
  allowedDevOrigins: ["imac-2020.local"],
};

export default nextConfig;
