import type { VehicleStatus } from "@/validations/types";

export type { VehicleStatus };

export interface StatusItemProps {
  status: VehicleStatus;
  isLast: boolean;
  isLoading?: boolean;
  onEdit?: (statusId: number | string, editComment: string, imageIds?: number[], newImages?: File[]) => Promise<void>;
  onDelete?: (statusId: number | string) => Promise<void>;
  vehicleId: string;
}

export interface VehicleStatusTimelineProps {
  statuses: VehicleStatus[];
  isLoading?: boolean;
  loadingStatusId?: string | number | null;
  onEdit?: (statusId: number | string, editComment: string, imageIds?: number[], newImages?: File[]) => Promise<void>;
  onDelete?: (statusId: number | string) => Promise<void>;
  vehicleId: string;
  onAddClick?: () => void;
}

















