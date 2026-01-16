export interface StrapiImage {
  url: string;
  alternativeText: string;
  formats?: {
    thumbnail?: { url?: string };
    small?: { url?: string };
    medium?: { url?: string };
    large?: { url?: string };
  };
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
  fullname_label: string;
  fullname_placeholder: string;
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
  stockQuantity?: number;
  color?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  documentId?: string;
  image?: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null };
  imageAlt?: string | null;
  nextMaintenanceDate?: string;
  placa?: string;
  assignedDrivers?: {
    data?: Array<{
      id: number;
      documentId?: string;
      attributes?: {
        displayName?: string;
        email?: string;
        avatar?: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null };
      };
    }>;
  };
  responsables?: {
    data?: Array<{
      id: number;
      documentId?: string;
      attributes?: {
        displayName?: string;
        email?: string;
        avatar?: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null };
      };
    }>;
  };
  currentDrivers?: {
    data?: Array<{
      id: number;
      documentId?: string;
      attributes?: {
        displayName?: string;
        email?: string;
        avatar?: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null };
      };
    }>;
  };
  interestedDrivers?: {
    data?: Array<{
      id: number;
      documentId?: string;
      attributes?: {
        displayName?: string;
        email?: string;
        avatar?: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null };
      };
    }>;
  };
  interestedPersons?: {
    data?: Array<{
      id: number;
      documentId?: string;
      attributes?: {
        fullName?: string;
        email?: string;
        phone?: string;
        status?: string;
        avatar?: FleetVehicleImage | { data?: { attributes?: FleetVehicleImage } | null };
      };
    }>;
  };
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
  imageData?: FleetVehicleImage; // Datos completos de la imagen con formats
  color?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  nextMaintenanceDate?: string;
  placa?: string;
  assignedDrivers?: Array<{
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  responsables?: Array<{
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  interestedDrivers?: Array<{
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  currentDrivers?: Array<{
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  interestedPersons?: Array<{
    id: number;
    documentId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    status?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
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
  responsables?: number[];
  assignedDrivers?: number[];
  interestedDrivers?: number[];
  currentDrivers?: number[];
  nextMaintenanceDate?: string | null;
  placa?: string | null;
  interestedPersons?: number[];
}

export interface VehicleStatus {
  id: number;
  documentId?: string;
  comment?: string;
  images?: Array<{
    id?: number;
    url?: string;
    alternativeText?: string;
  }>;
  authorDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  };
}

export interface VehicleStatusPayload {
  comment?: string;
  images?: number[];
  authorDocumentId?: string;
}

export type FleetDocumentType =
  | "poliza_seguro"
  | "ficha_tecnica"
  | "tarjeta_propiedad"
  | "contrato_compraventa"
  | "matricula_vehicular"
  | "certificado_revisado"
  | "otros";

export interface FleetDocument {
  id: number;
  documentId?: string;
  documentType: FleetDocumentType;
  otherDescription?: string;
  files?: Array<{
    id?: number;
    url?: string;
    name?: string;
    mime?: string;
    size?: number;
    alternativeText?: string;
  }>;
  authorDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  };
}

export interface FleetDocumentPayload {
  documentType: FleetDocumentType;
  files: number[];
  authorDocumentId?: string;
  otherDescription?: string;
}

export type ReminderType = "unique" | "recurring";
export type RecurrencePattern = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
export type ReminderModule = "fleet" | "calendar" | "billing" | "contracts" | "inventory" | "services";

export interface FleetReminder {
  id: number;
  documentId?: string;
  title: string;
  description?: string;
  reminderType: ReminderType;
  module?: ReminderModule;
  scheduledDate: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  isActive: boolean;
  isCompleted?: boolean;
  lastTriggered?: string;
  nextTrigger: string;
  authorDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  };
  assignedUsers?: Array<{
    id: number;
    documentId?: string;
    displayName?: string;
    email?: string;
    avatar?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  vehicle?: {
    id: number;
    documentId?: string;
    name?: string;
  };
}

export interface FleetReminderPayload {
  title: string;
  description?: string;
  reminderType: ReminderType;
  module?: ReminderModule;
  scheduledDate: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  assignedUserIds?: Array<number | string>;
  authorDocumentId?: string;
}

