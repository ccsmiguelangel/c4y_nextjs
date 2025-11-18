import type { NextConfig } from "next";
import { STRAPI_BASE_URL } from "./lib/strapi";
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{
      protocol: "http",
      hostname: "localhost",
      port: "1337",
      pathname: "/**",
    }],
    unoptimized: true
  },
};

export default nextConfig;