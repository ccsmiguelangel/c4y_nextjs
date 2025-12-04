"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components_shadcn/ui/select";
import { Plus, Droplet, Wrench, Car, Activity, Settings, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface Service {
  id: string;
  name: string;
  price: string;
  coverage: string;
  icon: React.ReactNode;
  isFree?: boolean;
}

export default function AdmServicesPage() {
  const router = useRouter();
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCoverage, setServiceCoverage] = useState("Pagado por el cliente");

  const predefinedServices: Service[] = [
    {
      id: "1",
      name: "Cambio de Aceite",
      price: "$80.00 USD",
      coverage: "Pagado por el cliente",
      icon: <Droplet className="h-5 w-5" />,
    },
    {
      id: "2",
      name: "Rotación de Neumáticos",
      price: "$50.00 USD",
      coverage: "Pagado por el cliente",
      icon: <Wrench className="h-5 w-5" />,
    },
    {
      id: "3",
      name: "Revisión de Frenos",
      price: "$120.00 USD",
      coverage: "Pagado por el cliente",
      icon: <Car className="h-5 w-5" />,
    },
    {
      id: "4",
      name: "Diagnóstico General",
      price: "$95.00 USD",
      coverage: "Pagado por el cliente",
      icon: <Activity className="h-5 w-5" />,
    },
    {
      id: "5",
      name: "Mantenimiento 50.000km",
      price: "Gratuito",
      coverage: "Cubierto por la empresa",
      icon: <Settings className="h-5 w-5" />,
      isFree: true,
    },
  ];

  const handleAddService = () => {
    // TODO: Implementar lógica para añadir servicio
    console.log({ serviceName, servicePrice, serviceCoverage });
  };

  return (
    <AdminLayout
      title="Gestión de Servicios"
      showFilterAction
    >
        {/* Sección: Servicios Predefinidos */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className={spacing.card.header}>
            <CardTitle className="text-base font-semibold">Servicios Predefinidos</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} ${spacing.card.content}`}>
            {predefinedServices.map((service) => (
              <Card 
                key={service.id} 
                className="shadow-sm ring-1 ring-inset ring-border/50 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                onClick={() => router.push(`/adm-services/details/${service.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {service.icon}
                    </div>
                    <p className={typography.body.base}>{service.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p
                        className={`${typography.body.base} font-semibold ${
                          service.isFree ? "text-green-600" : ""
                        }`}
                      >
                        {service.price}
                      </p>
                      <p className={`text-xs ${
                        service.isFree ? "text-green-600" : "text-muted-foreground"
                      }`}>
                        {service.coverage}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Sección: Añadir Nuevo Servicio */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className={spacing.card.header}>
            <CardTitle className="text-base font-semibold">
              Añadir Nuevo Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.medium} ${spacing.card.content}`}>
            <div className={`flex flex-col ${spacing.gap.small}`}>
              <Label htmlFor="service-name">Nombre del Servicio</Label>
              <Input
                id="service-name"
                name="service-name"
                placeholder="Ej. Alineación y Balanceo"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
              />
            </div>

            <div className={`flex flex-col ${spacing.gap.small}`}>
              <Label htmlFor="service-price">Precio (USD)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="service-price"
                  name="service-price"
                  placeholder="0.00"
                  className="pl-7 pr-12"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
                  USD
                </span>
              </div>
            </div>

            <div className={`flex flex-col ${spacing.gap.small}`}>
              <Label htmlFor="service-coverage">Cobertura del coste</Label>
              <Select value={serviceCoverage} onValueChange={setServiceCoverage}>
                <SelectTrigger id="service-coverage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pagado por el cliente">
                    Pagado por el cliente
                  </SelectItem>
                  <SelectItem value="Cubierto por la empresa">
                    Cubierto por la empresa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="default"
              className="btn-black flex items-center justify-center"
              onClick={handleAddService}
            >
              <Plus />
              Añadir Servicio
            </Button>
          </CardContent>
        </Card>
    </AdminLayout>
  );
}
