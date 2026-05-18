import type { NextConfig } from "next";
import { 
  STRAPI_BASE_URL, 
  STRAPI_BASE_URL_HOSTNAME, 
  STRAPI_BASE_URL_PROTOCOL, 
  STRAPI_BASE_URL_PORT 
} from "@/lib/config";

if (!STRAPI_BASE_URL) {
  throw new Error("STRAPI_BASE_URL is not set. Please set NEXT_PUBLIC_STRAPI_BASE_URL in your .env.local file");
}

const nextConfig: NextConfig = {
  // cacheComponents: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: STRAPI_BASE_URL_PROTOCOL as "http" | "https",
        hostname: STRAPI_BASE_URL_HOSTNAME as URL["hostname"],
        port: STRAPI_BASE_URL_PORT as URL["port"],
        pathname: "/**" as URL["pathname"],
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;