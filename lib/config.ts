// for optimization, i dont want to use the process.env.NEXT_PUBLIC_STRAPI_BASE_URL in the future
export const STRAPI_BASE_URL = "http://localhost:1337"; // SETUP YOUR STRAPI_BASE_URL HERE


export const STRAPI_BASE_URL_PROTOCOL = STRAPI_BASE_URL.split("://")[0];
export const STRAPI_BASE_URL_HOSTNAME = STRAPI_BASE_URL.split("://")[1].split(":")[0];
export const STRAPI_BASE_URL_PORT = STRAPI_BASE_URL.split("://")[1].split(":")[1];

// if the STRAPI_BASE_URL is not set, throw an error and log the error in the console
if (!STRAPI_BASE_URL) {
  throw new Error("STRAPI_BASE_URL is not set. Please set NEXT_PUBLIC_STRAPI_BASE_URL in your .env.local file");
}

// if the STRAPI_BASE_URL_PROTOCOL is not set, throw an error and log the error in the console
if (!STRAPI_BASE_URL_PROTOCOL) {
  throw new Error("STRAPI_BASE_URL_PROTOCOL is not set. Please set NEXT_PUBLIC_STRAPI_BASE_URL_PROTOCOL in your .env.local file");
}

// if the STRAPI_BASE_URL_HOSTNAME is not set, throw an error and log the error in the console
if (!STRAPI_BASE_URL_HOSTNAME) {
  throw new Error("STRAPI_BASE_URL_HOSTNAME is not set. Please set NEXT_PUBLIC_STRAPI_BASE_URL_HOSTNAME in your .env.local file");
}

// if the STRAPI_BASE_URL_PORT is not set, throw an error and log the error in the console
if (!STRAPI_BASE_URL_PORT) {
  throw new Error("STRAPI_BASE_URL_PORT is not set. Please set NEXT_PUBLIC_STRAPI_BASE_URL_PORT in your .env.local file");
}


