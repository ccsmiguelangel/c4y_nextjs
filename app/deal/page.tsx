"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Separator } from "@/components_shadcn/ui/separator";
import { 
  MoreVertical, 
  Plus, 
  FileText, 
  Upload, 
  Bell, 
  Eye, 
  Archive, 
  CheckCircle,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import { spacing, typography, commonClasses } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface Deal {
  id: string;
  type: "conduccion" | "arrendamiento" | "servicio";
  driver: string;
  status: "pendiente" | "firmado" | "archivado";
  date: string;
  dateLabel: string;
}

const deals: Deal[] = [
  {
    id: "1",
    type: "conduccion",
    driver: "Ana López",
    status: "pendiente",
    date: "2024-06-05",
    dateLabel: "Generado",
  },
  {
    id: "2",
    type: "arrendamiento",
    driver: "Jorge Martinez",
    status: "firmado",
    date: "2024-06-02",
    dateLabel: "Firmado",
  },
  {
    id: "3",
    type: "servicio",
    driver: "Laura Gómez",
    status: "archivado",
    date: "2024-05-15",
    dateLabel: "Archivado",
  },
  {
    id: "4",
    type: "conduccion",
    driver: "Ricardo Pérez",
    status: "pendiente",
    date: "2024-05-28",
    dateLabel: "Generado",
  },
];

const getDealTypeLabel = (type: Deal["type"]) => {
  switch (type) {
    case "conduccion":
      return "Contrato de Conducción";
    case "arrendamiento":
      return "Contrato de Arrendamiento";
    case "servicio":
      return "Contrato de Servicio";
  }
};

const getStatusBadge = (status: Deal["status"]) => {
  switch (status) {
    case "pendiente":
      return (
        <Badge className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
          Pendiente de Firma
        </Badge>
      );
    case "firmado":
      return (
        <Badge className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Firmado
        </Badge>
      );
    case "archivado":
      return (
        <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
          Archivado
        </Badge>
      );
  }
};

const getActionButton = (status: Deal["status"]) => {
  switch (status) {
    case "pendiente":
      return (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 rounded-lg bg-muted hover:bg-muted/80"
        >
          <Bell className="h-4 w-4" />
          Enviar Recordatorio
        </Button>
      );
    case "firmado":
      return (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 rounded-lg bg-muted hover:bg-muted/80"
        >
          <Eye className="h-4 w-4" />
          Ver Contrato
        </Button>
      );
    case "archivado":
      return (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 rounded-lg bg-muted hover:bg-muted/80"
        >
          <Archive className="h-4 w-4" />
          Desarchivar
        </Button>
      );
  }
};

export default function DealPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDeals = deals.filter((deal) =>
    deal.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getDealTypeLabel(deal.type).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Gestión de Contratos">
      {/* Botones de acción principal */}
      <section className={`flex ${spacing.gap.small}`}>
        <Button
          variant="default"
          className="flex-1 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Generar Contrato
        </Button>
        <Button
          variant="outline"
          className="flex-1 flex items-center justify-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Subir Contrato
        </Button>
      </section>

      {/* Barra de búsqueda */}
      <section>
        <SearchInput
          variant="muted"
          placeholder="Buscar por conductor, matrícula..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </section>

      <Separator />

      {/* Lista de Contratos */}
      <section className={`flex flex-col ${spacing.gap.base} pb-24`}>
        {filteredDeals.map((deal) => (
          <Card
            key={deal.id}
            className={`${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
            onClick={() => router.push(`/deal/details/${deal.id}`)}
          >
            <CardContent className={`flex flex-col ${spacing.gap.base} ${spacing.card.padding}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`${typography.body.large} font-bold`}>
                    {getDealTypeLabel(deal.type)}
                  </p>
                  <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                    Conductor: {deal.driver}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(deal.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground flex items-center justify-center"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/deal/details/${deal.id}`); }}>
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className={`${typography.body.small} text-muted-foreground`}>
                  {deal.dateLabel}: {new Date(deal.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div onClick={(e) => e.stopPropagation()}>
                  {getActionButton(deal.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </AdminLayout>
  );
}
