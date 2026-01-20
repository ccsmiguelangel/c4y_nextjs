// for optimization, i dont want to use the process.env.NEXT_PUBLIC_STRAPI_BASE_URL in the future
// export const STRAPI_BASE_URL = "https://big-breeze-b8fd1e4629.strapiapp.com"; // SETUP YOUR STRAPI_BASE_URL HERE
// export const STRAPI_API_TOKEN = '1402d7c2d659d76d963c52a7c387ba96ca56139013864789391e1c58a69c8ccc44f121e9ac79e7fa8bccb861e7abcee523d981e94de153fa0c5c2b729122c14e13d1ff46b83a7198e52b18d13462aa94bb37eedca380a34090a86471309110236e91ee3414d659cf5794b77eadb08726f88956461aa8a2ad9e7180e6937fae64';



// Token de API de Strapi - SOLO SERVER-SIDE, nunca se expone al cliente
export const STRAPI_API_TOKEN = '90a2e265de3721f9156d4d3ce87169c175f063214eb317da768d7e7dcff907f20204a16bf616c8725664ecf36210de6b4397ee2d730cd3cf0be80056abd68a6b96dccdd3093bf3ca9ecab54c5a0b3137793395e84d5ee97fe70803a5518f02f350fd3f095bb79b7d2d41c568ff041afa01a6fd5b3eb36478f915a057b88ff99d';
export const STRAPI_BASE_URL = "http://localhost:1337"; // SETUP YOUR STRAPI_BASE_URL HERE


export const STRAPI_BASE_URL_PROTOCOL = STRAPI_BASE_URL.split("://")[0];
export const STRAPI_BASE_URL_HOSTNAME = STRAPI_BASE_URL.split("://")[1].split(":")[0];
// export const STRAPI_BASE_URL_PORT = STRAPI_BASE_URL.split("://")[1].split(":")[1];
export const STRAPI_BASE_URL_PORT = "80";


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

// if the STRAPI_API_TOKEN is not set, throw an error and log the error in the console
if (!STRAPI_API_TOKEN) {
  throw new Error("STRAPI_API_TOKEN is not set. Please set STRAPI_API_TOKEN in your .env.local file");
}


