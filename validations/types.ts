export interface StrapiImage {
  url: string;
  alternativeText: string;
}

export interface StrapiLink {
  href: string;
  isExternal: boolean;
  label: string;
}

export interface HeroSectionData {
  heading: string;
  sub_heading: string;
  image: StrapiImage;
  link: StrapiLink;
}

export interface StrapiPageMetadata {
  title: string;
  description: string;
  favicon?: StrapiImage;
}

export interface StrapiResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface HeaderSection {
  title: string;
  subtitle: string;
}

export interface SinginFormData {
  header: HeaderSection;
  email_label: string;
  email_placeholder: string;
  password_label: string;
  password_placeholder: string;
  submit_button: string;
  singup_previous_link_text: string;
  singup_link: StrapiLink[];
}

export interface SinginData {
  title: string;
  description: string;
  header: {
    title: string;
    description: string;
    favicon?: StrapiImage;
  };
  sections: Array<{
    __component: string;
  } & SinginFormData>;
}

export interface SinginDataProcessed {
  title: string;
  description: string;
  header: {
    title: string;
    description: string;
    favicon?: StrapiImage;
  };
  singinForm: SinginFormData;
}

export interface SingupFormData {
  header: HeaderSection;
  username_label: string;
  username_placeholder: string;
  email_label: string;
  email_placeholder: string;
  password_label: string;
  password_placeholder: string;
  submit_buton: string;
  singin_previous_link_text: string;
  singin_link: StrapiLink[];
}

export interface SingupData {
  Title: string;
  Description: string;
  header: Array<{
    title: string;
    description: string;
    favicon?: StrapiImage;
  }>;
  sections: Array<{
    __component: string;
  } & SingupFormData>;
}

export interface SingupDataProcessed {
  title: string;
  description: string;
  header: {
    title: string;
    description: string;
    favicon?: StrapiImage;
  };
  singupForm: SingupFormData;
}

export interface DashboardData {
  title: string;
  description: string;
  favicon?: StrapiImage;
  sections: Array<{
    __component: string;
  } & HeroSectionData>;
}

export interface DashboardDataProcessed {
  title: string;
  description: string;
  favicon?: StrapiImage;
  sections: HeroSectionData[];
}

export type FleetVehicleCondition = "nuevo" | "usado" | "seminuevo";

export interface FleetVehicleImage {
  url?: string;
  alternativeText?: string;
  formats?: {
    thumbnail?: { url?: string };
    small?: { url?: string };
    medium?: { url?: string };
    large?: { url?: string };
  };
}

export interface FleetVehicleRawAttributes {
  name: string;
  vin: string;
  price: string | number;
  condition: FleetVehicleCondition;
  brand: string;
  model: string;
  year: number;
  color?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  documentId?: string;
  image?: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null };
  imageAlt?: string | null;
}

export type FleetVehicleRaw =
  | ({ id?: number | string; documentId?: string } & FleetVehicleRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: FleetVehicleRawAttributes & { documentId?: string };
    };

export interface FleetVehicleCard {
  id: string;
  documentId: string;
  name: string;
  vin: string;
  priceNumber: number;
  priceLabel: string;
  condition: FleetVehicleCondition;
  brand: string;
  model: string;
  year: number;
  imageUrl?: string;
  imageAlt?: string;
  color?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
}

export interface FleetVehicleUpdatePayload {
  name?: string;
  vin?: string;
  price?: number;
  condition?: FleetVehicleCondition;
  brand?: string;
  model?: string;
  year?: number;
  color?: string | null;
  mileage?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  image?: number | null;
  imageAlt?: string | null;
}

