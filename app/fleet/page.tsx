"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Input } from "@/components_shadcn/ui/input";
import { Separator } from "@/components_shadcn/ui/separator";
import { ScrollArea } from "@/components_shadcn/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components_shadcn/ui/dropdown-menu";
import { Search, MoreVertical, ChevronDown, Plus, Car, X, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { commonClasses, spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import Image from "next/image";

interface Vehicle {
  id: string;
  name: string;
  vin: string;
  price: string;
  status: "nuevo" | "usado" | "seminuevo";
  brand: string;
  model: string;
  year: number;
  image: string;
  imageAlt: string;
}

const vehicles: Vehicle[] = [
  {
    id: "1",
    name: "Ford Mustang 2023",
    vin: "1ZVBP8...",
    price: "$55,000",
    status: "nuevo",
    brand: "Ford",
    model: "Mustang",
    year: 2023,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBHQ-PFSUQDANEfTXpOlEKQ2nDYpnZ_O1xQOseEEX-RcKWhWF-WUtGa0-YYqKo9af0QFcll6_c0LKN95sQ7pj7bJ56ZdhlQx2TRSdz5W29YJSqWEBl_BuReqP_BgC_iMZ-Cy95Hsa-ISBdCI-q7cl5kdeIvPSFTKMbOq1DMsRF9rcP9md7aywq5QMTxi52cM3ryR6N0zJvS2UPCMMaL_NUCgVwYdvsvgHB_RRcla88LU-ozwhCneojMav87IMWxogKyMsVCMtis4H8",
    imageAlt: "Silver Ford Mustang",
  },
  {
    id: "2",
    name: "Honda Civic 2021",
    vin: "2HGFC1...",
    price: "$28,000",
    status: "usado",
    brand: "Honda",
    model: "Civic",
    year: 2021,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB7O40UUyjASVNen_GJmVjX7y2oOpujom0e3_SVJpkSxqa9jpuoGDMEfWq2PQE7OPM7ffqwQpnolQnTvSKtt5pReNTl_iE10A7hdwHuU61Vo1DU8503fajDBRw4P8v0Iiz6_rtFGC0PwpXYWDEmHIL0rmHEqSITMji6eHSnmtSZDaqxj0j9jyxybg8F8BjrwB83Ggo-JmeLzhBy60XrV44USpNyL9iol52tFpCW04lCCYY6SZZgrfvY1woPvbsx3WSAqLqwl2owBfc",
    imageAlt: "Blue Honda Civic",
  },
  {
    id: "3",
    name: "Toyota RAV4 2022",
    vin: "JTMEP4...",
    price: "$35,500",
    status: "seminuevo",
    brand: "Toyota",
    model: "RAV4",
    year: 2022,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCFdVv4GK_wJ2IA7BWTG6C3RUOxj8EoYhWGEPfbWHHH25OYtvRITA49FTjCA7_MC9dDfoJhQ2YTLETxTYbj_xRFylSjAXbOg1CPv9lJcpRWwbHpfEHJILUBCY8uRy3bHBtTl8bi78IfZz-elig4Ija-6RQ6VXcR9paEBBwmnxyZX1Bb8Gk7cU6litwdP5Zw6wPywgXRW8RTXhaVfHmr_PZTyPtmI2T7Wf1zUaAS-qlqOWqfKdmhxYkq1XFd9isfeKjVSryEUzLTkTA",
    imageAlt: "White Toyota RAV4",
  },
];

const getStatusBadge = (status: Vehicle["status"]) => {
  switch (status) {
    case "nuevo":
      return (
        <Badge className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
          Nuevo
        </Badge>
      );
    case "usado":
      return (
        <Badge className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
          Usado
        </Badge>
      );
    case "seminuevo":
      return (
        <Badge className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
          Seminuevo
        </Badge>
      );
  }
};

const brands = Array.from(new Set(vehicles.map((v) => v.brand))).sort();
const models = Array.from(new Set(vehicles.map((v) => v.model))).sort();
const years = Array.from(new Set(vehicles.map((v) => v.year))).sort((a, b) => b - a);
const statuses: Vehicle["status"][] = ["nuevo", "usado", "seminuevo"];

export default function FleetPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Vehicle["status"] | null>(null);

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = !selectedBrand || vehicle.brand === selectedBrand;
    const matchesModel = !selectedModel || vehicle.model === selectedModel;
    const matchesYear = !selectedYear || vehicle.year === selectedYear;
    const matchesStatus = !selectedStatus || vehicle.status === selectedStatus;
    return matchesSearch && matchesBrand && matchesModel && matchesYear && matchesStatus;
  });

  const clearFilters = () => {
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setSelectedStatus(null);
  };

  const hasActiveFilters = selectedBrand || selectedModel || selectedYear || selectedStatus;

  return (
    <AdminLayout title="Flota">
      {/* Search Bar */}
      <section className={`flex flex-col ${spacing.gap.base}`}>
        <label className="flex flex-col min-w-40 h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-muted">
            <div className="text-muted-foreground flex items-center justify-center pl-4">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="text"
              suppressHydrationWarning
              className="flex w-full min-w-0 flex-1 border-none bg-muted focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:ring-0 focus:outline-none h-full rounded-l-none border-l-0 pl-2 text-base placeholder:text-muted-foreground"
              placeholder="Buscar por nombre, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </label>

        {/* Filtros */}
        <ScrollArea className="w-full whitespace-nowrap">
          <nav className={`flex ${spacing.gap.small} py-2`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedBrand ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Marca</span>
                  {selectedBrand && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0">{selectedBrand}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Marca</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedBrand(null)}>
                  Todas las marcas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {brands.map((brand) => (
                  <DropdownMenuItem
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    {brand}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedModel ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Modelo</span>
                  {selectedModel && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0">{selectedModel}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Modelo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedModel(null)}>
                  Todos los modelos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {models.map((model) => (
                  <DropdownMenuItem
                    key={model}
                    onClick={() => setSelectedModel(model)}
                  >
                    {model}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedYear ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Año</span>
                  {selectedYear && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0">{selectedYear}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Año</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedYear(null)}>
                  Todos los años
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {years.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  suppressHydrationWarning
                  className={`h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none ${
                    selectedStatus ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
                  }`}
                >
                  <span className={typography.body.base}>Estado</span>
                  {selectedStatus && (
                    <>
                      <span className="ml-1 shrink-0">·</span>
                      <span className="shrink-0 capitalize">{selectedStatus}</span>
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" alignOffset={6} className="w-48 z-[100]">
                <DropdownMenuLabel>Seleccionar Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedStatus(null)}>
                  Todos los estados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {statuses.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                  >
                    <span className="capitalize">{status}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-3 rounded-lg bg-muted border-none hover:bg-muted/80"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 shrink-0" />
                <span className={typography.body.base}>Limpiar</span>
              </Button>
            )}
          </nav>
        </ScrollArea>
      </section>

      <Separator />

      {/* Lista de Vehículos */}
      {filteredVehicles.length > 0 ? (
        <div className={`flex flex-col ${spacing.gap.medium}`}>
          {filteredVehicles.map((vehicle) => (
            <Card 
              key={vehicle.id} 
              className={`${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
              onClick={() => router.push(`/fleet/details/${vehicle.id}`)}
            >
              <CardContent className={`flex items-start ${spacing.gap.medium} ${spacing.card.padding}`}>
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-28">
                  <Image
                    src={vehicle.image}
                    alt={vehicle.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 96px, 112px"
                  />
                </div>
                <div className={`flex flex-1 flex-col ${spacing.gap.small}`}>
                  <div className="flex items-center justify-between">
                    <p className={`${typography.body.large} font-bold leading-tight`}>
                      {vehicle.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground flex items-center justify-center"
                          >
                            <MoreVertical className="h-5 w-5" />
                            <span className="sr-only">Más opciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/fleet/details/${vehicle.id}`); }}>
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
                  <p className={`${typography.body.base} text-muted-foreground leading-normal`}>
                    VIN: {vehicle.vin}
                  </p>
                  <p className={`${typography.body.base} font-semibold leading-normal`}>
                    {vehicle.price}
                  </p>
                  <div className="pt-1">{getStatusBadge(vehicle.status)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={commonClasses.card}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Car className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className={`mt-4 ${typography.h3} text-foreground`}>
              No se encontraron vehículos
            </h3>
            <p className={`mt-1 ${typography.body.small}`}>
              Prueba a cambiar los filtros o añade un nuevo vehículo al inventario.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Añadir vehículo</span>
      </Button>
    </AdminLayout>
  );
}
