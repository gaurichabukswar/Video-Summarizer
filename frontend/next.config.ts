import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large file uploads to pass through to the backend
  // (uploads go directly to FastAPI, not through Next.js API routes)
};

export default nextConfig;
