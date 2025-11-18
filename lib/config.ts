export const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";

if (!STRAPI_BASE_URL) {
  throw new Error("STRAPI_BASE_URL is not set. Please set NEXT_PUBLIC_STRAPI_BASE_URL in your .env.local file");
}

