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

// ============================================
// Service Types (Servicios de mantenimiento)
// ============================================

export type ServiceCoverage = "cliente" | "empresa";

export interface ServiceRawAttributes {
  name: string;
  price: number;
  coverage: ServiceCoverage;
  description?: string;
  category?: string;
  documentId?: string;
}

export type ServiceRaw =
  | ({ id?: number | string; documentId?: string } & ServiceRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: ServiceRawAttributes & { documentId?: string };
    };

export interface ServiceCard {
  id: string;
  documentId: string;
  name: string;
  price: number;
  priceLabel: string;
  coverage: ServiceCoverage;
  coverageLabel: string;
  isFree: boolean;
  description?: string;
  category?: string;
}

export interface ServiceCreatePayload {
  name: string;
  price: number;
  coverage: ServiceCoverage;
  description?: string;
  category?: string;
}

export interface ServiceUpdatePayload {
  name?: string;
  price?: number;
  coverage?: ServiceCoverage;
  description?: string;
  category?: string;
}

// ============================================
// Inventory Types (Inventario de piezas)
// ============================================

export type StockStatus = "high" | "medium" | "low";
export type InventoryIcon = "filter" | "disc" | "bolt" | "tire";

export interface InventoryItemRawAttributes {
  code: string;
  description: string;
  stock: number;
  assignedTo?: string;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  lastRestocked?: string;
  icon?: InventoryIcon;
  documentId?: string;
}

export type InventoryItemRaw =
  | ({ id?: number | string; documentId?: string } & InventoryItemRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: InventoryItemRawAttributes & { documentId?: string };
    };

export interface InventoryItemCard {
  id: string;
  documentId: string;
  code: string;
  description: string;
  stock: number;
  stockStatus: StockStatus;
  assignedTo?: string;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  lastRestocked?: string;
  icon: InventoryIcon;
}

export interface InventoryItemCreatePayload {
  code: string;
  description: string;
  stock: number;
  assignedTo?: string;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  lastRestocked?: string;
  icon?: InventoryIcon;
}

export interface InventoryItemUpdatePayload {
  code?: string;
  description?: string;
  stock?: number;
  assignedTo?: string;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  lastRestocked?: string;
  icon?: InventoryIcon;
}

// ============================================
// Billing Types (Facturación y pagos)
// ============================================

export type BillingStatus = "pagado" | "pendiente" | "retrasado";

export interface BillingDocumentFile {
  id?: number;
  url?: string;
  name?: string;
  mime?: string;
  size?: number;
  alternativeText?: string;
}

export interface BillingDocumentRawAttributes {
  name: string;
  file?: BillingDocumentFile | { data?: { attributes?: BillingDocumentFile } | null };
  documentId?: string;
}

export type BillingDocumentRaw =
  | ({ id?: number | string; documentId?: string } & BillingDocumentRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: BillingDocumentRawAttributes & { documentId?: string };
    };

export interface BillingRecordRawAttributes {
  invoiceNumber: string;
  amount: number | string;
  currency?: string;
  status: BillingStatus;
  dueDate?: string;
  paymentDate?: string;
  notes?: string;
  remindersSent?: number;
  documentId?: string;
  client?: {
    id?: number;
    documentId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    avatar?: StrapiImage | { data?: { attributes?: StrapiImage } | null };
  } | {
    data?: {
      id?: number;
      documentId?: string;
      attributes?: {
        fullName?: string;
        email?: string;
        phone?: string;
        avatar?: StrapiImage | { data?: { attributes?: StrapiImage } | null };
      };
    } | null;
  };
  vehicle?: {
    id?: number;
    documentId?: string;
    name?: string;
  } | {
    data?: {
      id?: number;
      documentId?: string;
      attributes?: {
        name?: string;
      };
    } | null;
  };
  documents?: BillingDocumentRaw[] | {
    data?: Array<{
      id?: number;
      documentId?: string;
      attributes?: BillingDocumentRawAttributes;
    }>;
  };
}

export type BillingRecordRaw =
  | ({ id?: number | string; documentId?: string } & BillingRecordRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: BillingRecordRawAttributes & { documentId?: string };
    };

export interface BillingDocument {
  id: string;
  documentId?: string;
  name: string;
  url?: string;
  mime?: string;
  size?: number;
}

export interface BillingRecordCard {
  id: string;
  documentId: string;
  invoiceNumber: string;
  amount: number;
  amountLabel: string;
  currency: string;
  status: BillingStatus;
  dueDate?: string;
  dueDateLabel?: string;
  paymentDate?: string;
  paymentDateLabel?: string;
  notes?: string;
  remindersSent: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientId?: string;
  clientDocumentId?: string;
  vehicleName?: string;
  vehicleId?: string;
  vehicleDocumentId?: string;
  documents: BillingDocument[];
}

export interface BillingRecordCreatePayload {
  invoiceNumber: string;
  amount: number;
  currency?: string;
  status?: BillingStatus;
  dueDate?: string;
  paymentDate?: string;
  notes?: string;
  client?: number | string;
  vehicle?: number | string;
}

export interface BillingRecordUpdatePayload {
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  status?: BillingStatus;
  dueDate?: string;
  paymentDate?: string;
  notes?: string;
  remindersSent?: number;
  client?: number | string | null;
  vehicle?: number | string | null;
}

export interface BillingDocumentCreatePayload {
  name: string;
  file: number;
  record: number | string;
}

// ============================================
// Deal Types (Contratos y acuerdos comerciales)
// ============================================

export type DealType = "conduccion" | "arrendamiento" | "servicio";
export type DealStatus = "pendiente" | "firmado" | "archivado";
export type DealPaymentAgreement = "semanal" | "quincenal";

export interface DealClauseRawAttributes {
  title: string;
  description?: string;
  documentId?: string;
}

export type DealClauseRaw =
  | ({ id?: number | string; documentId?: string } & DealClauseRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: DealClauseRawAttributes & { documentId?: string };
    };

export interface DealDiscountRawAttributes {
  title: string;
  description?: string;
  amount: number | string;
  documentId?: string;
}

export type DealDiscountRaw =
  | ({ id?: number | string; documentId?: string } & DealDiscountRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: DealDiscountRawAttributes & { documentId?: string };
    };

export interface DealRawAttributes {
  title?: string;
  type: DealType;
  status: DealStatus;
  generatedAt?: string;
  signedAt?: string;
  price?: number | string;
  paymentAgreement?: DealPaymentAgreement;
  summary?: string;
  documentId?: string;
  client?: {
    id?: number;
    documentId?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  } | {
    data?: {
      id?: number;
      documentId?: string;
      attributes?: {
        fullName?: string;
        email?: string;
        phone?: string;
      };
    } | null;
  };
  vehicle?: {
    id?: number;
    documentId?: string;
    name?: string;
    placa?: string;
  } | {
    data?: {
      id?: number;
      documentId?: string;
      attributes?: {
        name?: string;
        placa?: string;
      };
    } | null;
  };
  seller?: {
    id?: number;
    documentId?: string;
    displayName?: string;
    email?: string;
  } | {
    data?: {
      id?: number;
      documentId?: string;
      attributes?: {
        displayName?: string;
        email?: string;
      };
    } | null;
  };
  clauses?: DealClauseRaw[] | {
    data?: Array<{
      id?: number;
      documentId?: string;
      attributes?: DealClauseRawAttributes;
    }>;
  };
  discounts?: DealDiscountRaw[] | {
    data?: Array<{
      id?: number;
      documentId?: string;
      attributes?: DealDiscountRawAttributes;
    }>;
  };
}

export type DealRaw =
  | ({ id?: number | string; documentId?: string } & DealRawAttributes)
  | {
      id?: number | string;
      documentId?: string;
      attributes: DealRawAttributes & { documentId?: string };
    };

export interface DealClause {
  id: string;
  documentId?: string;
  title: string;
  description?: string;
}

export interface DealDiscount {
  id: string;
  documentId?: string;
  title: string;
  description?: string;
  amount: number;
  amountLabel: string;
}

export interface DealCard {
  id: string;
  documentId: string;
  title?: string;
  type: DealType;
  typeLabel: string;
  status: DealStatus;
  statusLabel: string;
  generatedAt?: string;
  generatedAtLabel?: string;
  signedAt?: string;
  signedAtLabel?: string;
  price?: number;
  priceLabel?: string;
  paymentAgreement: DealPaymentAgreement;
  paymentAgreementLabel: string;
  summary?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientId?: string;
  clientDocumentId?: string;
  vehicleName?: string;
  vehiclePlaca?: string;
  vehicleId?: string;
  vehicleDocumentId?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerId?: string;
  sellerDocumentId?: string;
  clauses: DealClause[];
  discounts: DealDiscount[];
}

export interface DealCreatePayload {
  title?: string;
  type: DealType;
  status?: DealStatus;
  generatedAt?: string;
  signedAt?: string;
  price?: number;
  paymentAgreement?: DealPaymentAgreement;
  summary?: string;
  client?: number | string;
  vehicle?: number | string;
  seller?: number | string;
}

export interface DealUpdatePayload {
  title?: string;
  type?: DealType;
  status?: DealStatus;
  generatedAt?: string;
  signedAt?: string;
  price?: number;
  paymentAgreement?: DealPaymentAgreement;
  summary?: string;
  client?: number | string | null;
  vehicle?: number | string | null;
  seller?: number | string | null;
}

export interface DealClauseCreatePayload {
  title: string;
  description?: string;
  deal: number | string;
}

export interface DealDiscountCreatePayload {
  title: string;
  description?: string;
  amount: number;
  deal: number | string;
}

