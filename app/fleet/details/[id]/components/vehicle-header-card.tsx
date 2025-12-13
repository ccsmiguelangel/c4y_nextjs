"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import { spacing, typography } from "@/lib/design-system";
import type { FleetVehicleCondition } from "@/validations/types";

interface VehicleHeaderCardProps {
  name: string;
  condition: FleetVehicleCondition;
  imageUrl: string | null;
  imageAlt: string;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const getStatusBadge = (status: FleetVehicleCondition) => {
  switch (status) {
    case "nuevo":
      return (
        <Badge className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-800 dark:text-green-100">
          Nuevo
        </Badge>
      );
    case "usado":
      return (
        <Badge className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-800 dark:text-orange-100">
          Usado
        </Badge>
      );
    case "seminuevo":
      return (
        <Badge className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-800 dark:text-blue-100">
          Seminuevo
        </Badge>
      );
  }
};

export function VehicleHeaderCard({
  name,
  condition,
  imageUrl,
  imageAlt,
  isDeleting,
  onEdit,
  onDelete,
}: VehicleHeaderCardProps) {
  const isBlobImage = Boolean(imageUrl && imageUrl.startsWith("blob:"));

  return (
    <Card 
      className="!bg-transparent shadow-sm backdrop-blur-sm border rounded-lg"
      style={{
        backgroundColor: 'color-mix(in oklch, var(--background) 50%, transparent)',
        borderColor: 'color-mix(in oklch, var(--border) 85%, transparent)',
      } as React.CSSProperties}
    >
      <CardContent className={`flex flex-col items-center ${spacing.gap.base} px-12 relative`}>
        <div className="absolute top-4 right-8 flex items-center justify-end z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full flex items-center justify-center"
                aria-label="Acciones"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[8rem]">
              <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
                Editar Vehículo
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer text-primary focus:text-primary hover:text-primary"
                onClick={onDelete}
                disabled={isDeleting}
              >
                Eliminar Vehículo
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative w-full h-96 mt-20 overflow-hidden rounded-lg bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
              unoptimized={isBlobImage}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>

        <div className="flex flex-col items-center text-center">
          <h2 className={typography.h3}>{name}</h2>
          <div className="mt-2">{getStatusBadge(condition)}</div>
        </div>

        <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
            onClick={onEdit}
            aria-label="Editar vehículo"
          >
            <Edit className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
            aria-label="Eliminar vehículo"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

