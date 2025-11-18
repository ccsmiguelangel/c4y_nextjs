import { STRAPI_BASE_URL } from "./config";
import type { StrapiImage } from "./types";

export const strapiImages = {
  getURL(url: string | undefined | null, fallback = "/favicon.ico"): string {
    if (!url) return fallback;
    if (url.startsWith("http")) return url;
    return `${STRAPI_BASE_URL}${url}`;
  },

  isObject(obj: any): obj is StrapiImage {
    return obj && typeof obj === "object" && !Array.isArray(obj) && "url" in obj && typeof obj.url === "string";
  },

  isArray(arr: any): arr is StrapiImage[] {
    return Array.isArray(arr) && arr.length > 0 && this.isObject(arr[0]);
  },

  process(data: any): any {
    if (!data || typeof data !== "object") return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.process(item));
    }
    
    return Object.entries(data).reduce((processed, [key, value]) => {
      if (this.isObject(value)) {
        processed[key] = { ...value, url: this.getURL(value.url) };
      } else if (this.isArray(value)) {
        processed[key] = value.map((img) => ({ ...img, url: this.getURL(img.url) }));
      } else {
        processed[key] = this.process(value);
      }
      return processed;
    }, {} as Record<string, any>);
  },
};

