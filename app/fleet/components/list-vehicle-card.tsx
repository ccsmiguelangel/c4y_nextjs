"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Checkbox } from "@/components_shadcn/ui/checkbox";
import Image from "next/image";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { spacing, typography } from "@/lib/design-system";
import type { FleetVehicleCard } from "@/validations/types";
import { ConditionBadge } from "./condition-badge";
import { VehicleActionMenu } from "./vehicle-action-menu";
import type { VehicleActionMenuProps } from "./vehicle-action-menu";
import type { CSSProperties } from "react";

export interface ListVehicleCardProps {
  vehicle: FleetVehicleCard;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleVehicleSelection: (vehicleId: string) => void;
  vehicleId: string;
  actionProps: Omit<VehicleActionMenuProps, "vehicle" | "vehicleId">;
}

export function ListVehicleCard({
  vehicle,
  isSelectMode,
  isSelected,
  onToggleVehicleSelection,
  vehicleId,
  actionProps,
}: ListVehicleCardProps) {
  return (
    <Card
      className={cn(
        "!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg transition-colors",
        isSelectMode ? "cursor-default" : "cursor-pointer hover:opacity-90 active:opacity-80",
        isSelected && "ring-2 ring-primary"
      )}
      style={{
        backgroundColor: "color-mix(in oklch, var(--background) 50%, transparent)",
        borderColor: "color-mix(in oklch, var(--border) 85%, transparent)",
      } as CSSProperties}
      onClick={() => {
        if (isSelectMode) {
          onToggleVehicleSelection(vehicleId);
        } else {
          actionProps.onNavigateToDetails(vehicleId);
        }
      }}
    >
      <CardContent className={`flex items-start ${spacing.gap.medium} ${spacing.card.padding}`}>
        {isSelectMode && (
          <div className="flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleVehicleSelection(vehicleId)}
              className="h-5 w-5"
            />
          </div>
        )}
        {vehicle.imageUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-28">
            <Image
              src={vehicle.imageUrl}
              alt={vehicle.imageAlt || vehicle.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 96px, 112px"
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted sm:h-28 sm:w-28">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className={`flex flex-1 flex-col ${spacing.gap.small}`}>
          <div className="flex items-center justify-between">
            <p className={`${typography.body.large} font-bold leading-tight`}>{vehicle.name}</p>
            <div className="flex items-center gap-2">
              {!isSelectMode && (
                <>
                  <VehicleActionMenu vehicle={vehicle} vehicleId={vehicleId} {...actionProps} />
                  <span className="sr-only">Más opciones</span>
                </>
              )}
            </div>
          </div>
          <p className={`${typography.body.base} text-muted-foreground leading-normal`}>VIN: {vehicle.vin}</p>
          <p className={`${typography.body.base} font-semibold leading-normal`}>{vehicle.priceLabel}</p>
          <div className="pt-1">
            <ConditionBadge status={vehicle.condition} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
