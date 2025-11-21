"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { 
  ArrowLeft, 
  MoreVertical, 
  Edit,
  Trash2,
  Car,
  Calendar,
  DollarSign,
  FileText,
  Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface VehicleData {
  id: string;
  name: string;
  vin: string;
  price: string;
  status: "nuevo" | "usado" | "seminuevo";
  brand: string;
  model: string;
  year: number;
  color: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  image: string;
  imageAlt: string;
}

const getVehicleData = (id: string): VehicleData | null => {
  const vehicles: Record<string, VehicleData> = {
    "1": {
      id: "1",
      name: "Ford Mustang 2023",
      vin: "1ZVBP8CM0D5281234",
      price: "$55,000",
      status: "nuevo",
      brand: "Ford",
      model: "Mustang",
      year: 2023,
      color: "Plata Metálico",
      mileage: 0,
      fuelType: "Gasolina",
      transmission: "Automática",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBHQ-PFSUQDANEfTXpOlEKQ2nDYpnZ_O1xQOseEEX-RcKWhWF-WUtGa0-YYqKo9af0QFcll6_c0LKN95sQ7pj7bJ56ZdhlQx2TRSdz5W29YJSqWEBl_BuReqP_BgC_iMZ-Cy95Hsa-ISBdCI-q7cl5kdeIvPSFTKMbOq1DMsRF9rcP9md7aywq5QMTxi52cM3ryR6N0zJvS2UPCMMaL_NUCgVwYdvsvgHB_RRcla88LU-ozwhCneojMav87IMWxogKyMsVCMtis4H8",
      imageAlt: "Silver Ford Mustang",
    },
    "2": {
      id: "2",
      name: "Honda Civic 2021",
      vin: "2HGFC1F56MH543210",
      price: "$28,000",
      status: "usado",
      brand: "Honda",
      model: "Civic",
      year: 2021,
      color: "Azul Marino",
      mileage: 35000,
      fuelType: "Híbrido",
      transmission: "CVT",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7O40UUyjASVNen_GJmVjX7y2oOpujom0e3_SVJpkSxqa9jpuoGDMEfWq2PQE7OPM7ffqwQpnolQnTvSKtt5pReNTl_iE10A7hdwHuU61Vo1DU8503fajDBRw4P8v0Iiz6_rtFGC0PwpXYWDEmHIL0rmHEqSITMji6eHSnmtSZDaqxj0j9jyxybg8F8BjrwB83Ggo-JmeLzhBy60XrV44USpNyL9iol52tFpCW04lCCYY6SZZgrfvY1woPvbsx3WSAqLqwl2owBfc",
      imageAlt: "Blue Honda Civic",
    },
    "3": {
      id: "3",
      name: "Toyota RAV4 2022",
      vin: "JTMEP4RE7ND123456",
      price: "$35,500",
      status: "seminuevo",
      brand: "Toyota",
      model: "RAV4",
      year: 2022,
      color: "Blanco Perla",
      mileage: 15000,
      fuelType: "Híbrido",
      transmission: "Automática",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFdVv4GK_wJ2IA7BWTG6C3RUOxj8EoYhWGEPfbWHHH25OYtvRITA49FTjCA7_MC9dDfoJhQ2YTLETxTYbj_xRFylSjAXbOg1CPv9lJcpRWwbHpfEHJILUBCY8uRy3bHBtTl8bi78IfZz-elig4Ija-6RQ6VXcR9paEBBwmnxyZX1Bb8Gk7cU6litwdP5Zw6wPywgXRW8RTXhaVfHmr_PZTyPtmI2T7Wf1zUaAS-qlqOWqfKdmhxYkq1XFd9isfeKjVSryEUzLTkTA",
      imageAlt: "White Toyota RAV4",
    },
  };
  return vehicles[id] || null;
};

const getStatusBadge = (status: VehicleData["status"]) => {
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

export default function FleetDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState("");
  const [formData, setFormData] = useState({
    price: "",
    mileage: "",
    color: "",
  });

  const vehicleData = getVehicleData(vehicleId);

  // Inicializar formData cuando se carga el vehículo
  useEffect(() => {
    if (vehicleData && !formData.price) {
      setFormData({
        price: vehicleData.price.replace("$", "").replace(",", ""),
        mileage: vehicleData.mileage?.toString() || "",
        color: vehicleData.color || "",
      });
    }
  }, [vehicleData]);

  if (!vehicleData) {
    return (
      <AdminLayout title="Vehículo no encontrado">
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px]`}>
          <p className={typography.body.large}>El vehículo solicitado no existe.</p>
          <Button onClick={() => router.push("/fleet")}>
            Volver a Flota
          </Button>
        </section>
      </AdminLayout>
    );
  }

  const handleSaveNote = () => {
    console.log("Nota guardada:", note, "para vehículo:", vehicleId);
    setNote("");
  };

  const handleSaveChanges = () => {
    console.log("Cambios guardados:", formData, "para vehículo:", vehicleId);
    setIsEditing(false);
  };

  return (
    <AdminLayout title={vehicleData.name}>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Información del Vehículo */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardContent className={`flex flex-col items-center ${spacing.gap.base} p-6 relative`}>
            {/* Botones de navegación */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full flex items-center justify-center"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex items-center justify-center">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[8rem]">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditing(true)}>
                    Editar Vehículo
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" className="cursor-pointer">
                    Eliminar Vehículo
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Imagen del Vehículo */}
            <div className="relative w-full h-64 mt-8 overflow-hidden rounded-lg bg-muted">
              <Image
                src={vehicleData.image}
                alt={vehicleData.imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
                priority
              />
            </div>

            {/* Nombre y Badge */}
            <div className="flex flex-col items-center text-center">
              <h2 className={`${typography.h3} text-center`}>
                {vehicleData.name}
              </h2>
              <div className="mt-2">{getStatusBadge(vehicleData.status)}</div>
            </div>

            {/* Botones de acción */}
            <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-5 w-5 flex-shrink-0" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                onClick={() => {
                  // Acción de eliminar
                }}
              >
                <Trash2 className="h-5 w-5 flex-shrink-0" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información Detallada */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Información del Vehículo</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {isEditing ? (
              <>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="price">Precio (USD)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="pl-7"
                      placeholder="55000"
                    />
                  </div>
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="mileage">Kilometraje</Label>
                  <Input
                    id="mileage"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    placeholder="35000"
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Azul Marino"
                  />
                </div>
                <div className={`flex ${spacing.gap.small} mt-2`}>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleSaveChanges}
                  >
                    Guardar Cambios
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Precio</p>
                    <p className={`${typography.body.large} font-semibold`}>{vehicleData.price}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>VIN</p>
                    <p className={typography.body.base}>{vehicleData.vin}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Año</p>
                    <p className={typography.body.base}>{vehicleData.year}</p>
                  </div>
                </div>
                {vehicleData.mileage !== undefined && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Kilometraje</p>
                      <p className={typography.body.base}>{vehicleData.mileage.toLocaleString()} km</p>
                    </div>
                  </div>
                )}
                {vehicleData.color && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Color</p>
                      <p className={typography.body.base}>{vehicleData.color}</p>
                    </div>
                  </div>
                )}
                {vehicleData.fuelType && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Combustible</p>
                      <p className={typography.body.base}>{vehicleData.fuelType}</p>
                    </div>
                  </div>
                )}
                {vehicleData.transmission && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Transmisión</p>
                      <p className={typography.body.base}>{vehicleData.transmission}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Notas y Comentarios */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Notas y Comentarios</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            <Textarea
              placeholder="Añadir una nota sobre el vehículo..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="min-h-24 resize-y"
            />
            <Button
              onClick={handleSaveNote}
              variant="default"
              className="btn-black"
              disabled={!note.trim()}
            >
              Guardar Nota
            </Button>
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
}

