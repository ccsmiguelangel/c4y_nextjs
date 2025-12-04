"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  Settings,
  Droplet,
  Wrench,
  Car,
  Activity
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components_shadcn/ui/select";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface ServiceData {
  id: string;
  name: string;
  price: string;
  coverage: string;
  description?: string;
  duration?: string;
  category?: string;
  icon: React.ReactNode;
  isFree?: boolean;
}

const getServiceData = (id: string): ServiceData | null => {
  const services: Record<string, ServiceData> = {
    "1": {
      id: "1",
      name: "Cambio de Aceite",
      price: "$80.00 USD",
      coverage: "Pagado por el cliente",
      description: "Servicio completo de cambio de aceite incluyendo filtro de aceite y verificación de niveles.",
      duration: "30 minutos",
      category: "Mantenimiento",
      icon: <Droplet className="h-5 w-5" />,
      isFree: false,
    },
    "2": {
      id: "2",
      name: "Rotación de Neumáticos",
      price: "$50.00 USD",
      coverage: "Pagado por el cliente",
      description: "Rotación de neumáticos para garantizar un desgaste uniforme y prolongar la vida útil.",
      duration: "45 minutos",
      category: "Mantenimiento",
      icon: <Wrench className="h-5 w-5" />,
      isFree: false,
    },
    "3": {
      id: "3",
      name: "Revisión de Frenos",
      price: "$120.00 USD",
      coverage: "Pagado por el cliente",
      description: "Inspección completa del sistema de frenos incluyendo pastillas, discos y líquido de frenos.",
      duration: "1 hora",
      category: "Reparación",
      icon: <Car className="h-5 w-5" />,
      isFree: false,
    },
    "4": {
      id: "4",
      name: "Diagnóstico General",
      price: "$95.00 USD",
      coverage: "Pagado por el cliente",
      description: "Diagnóstico completo del vehículo usando equipos de última generación.",
      duration: "1 hora",
      category: "Diagnóstico",
      icon: <Activity className="h-5 w-5" />,
      isFree: false,
    },
    "5": {
      id: "5",
      name: "Mantenimiento 50.000km",
      price: "Gratuito",
      coverage: "Cubierto por la empresa",
      description: "Mantenimiento completo incluido en la garantía del vehículo.",
      duration: "2 horas",
      category: "Mantenimiento",
      icon: <Settings className="h-5 w-5" />,
      isFree: true,
    },
  };
  return services[id] || null;
};

export default function AdmServicesDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    coverage: "Pagado por el cliente",
    description: "",
    duration: "",
  });

  const serviceData = getServiceData(serviceId);

  // Inicializar formData cuando se carga el servicio
  useEffect(() => {
    if (serviceData && !formData.name) {
      setFormData({
        name: serviceData.name,
        price: serviceData.price.replace("$", "").replace(" USD", "").replace("Gratuito", ""),
        coverage: serviceData.coverage,
        description: serviceData.description || "",
        duration: serviceData.duration || "",
      });
    }
  }, [serviceData]);

  if (!serviceData) {
    return (
      <AdminLayout title="Servicio no encontrado" showFilterAction>
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px]`}>
          <p className={typography.body.large}>El servicio solicitado no existe.</p>
          <Button onClick={() => router.push("/adm-services")}>
            Volver a Servicios
          </Button>
        </section>
      </AdminLayout>
    );
  }

  const handleSaveNote = () => {
    console.log("Nota guardada:", note, "para servicio:", serviceId);
    setNote("");
  };

  const handleSaveChanges = () => {
    console.log("Cambios guardados:", formData, "para servicio:", serviceId);
    setIsEditing(false);
  };

  return (
    <AdminLayout title={serviceData.name} showFilterAction>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Información del Servicio */}
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
                    Editar Servicio
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" className="cursor-pointer">
                    Eliminar Servicio
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Icono */}
            <div className={`flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mt-8`}>
              {serviceData.icon}
            </div>

            {/* Nombre y Badge */}
            <div className="flex flex-col items-center text-center">
              <h2 className={`${typography.h3} text-center`}>
                {serviceData.name}
              </h2>
              {serviceData.category && (
                <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                  {serviceData.category}
                </p>
              )}
              <div className="mt-2">
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${
                  serviceData.isFree ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {serviceData.coverage}
                </Badge>
              </div>
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
            <CardTitle className={typography.h4}>Detalles del Servicio</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {isEditing ? (
              <>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="name">Nombre del Servicio</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Cambio de Aceite"
                  />
                </div>
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
                      placeholder="80.00"
                    />
                  </div>
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="coverage">Cobertura del coste</Label>
                  <Select value={formData.coverage} onValueChange={(value) => setFormData({ ...formData, coverage: value })}>
                    <SelectTrigger id="coverage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pagado por el cliente">Pagado por el cliente</SelectItem>
                      <SelectItem value="Cubierto por la empresa">Cubierto por la empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descripción del servicio..."
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="duration">Duración</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="30 minutos"
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
                    <p className={`${typography.body.large} font-semibold ${
                      serviceData.isFree ? "text-green-600" : ""
                    }`}>
                      {serviceData.price}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Cobertura</p>
                    <p className={typography.body.base}>{serviceData.coverage}</p>
                  </div>
                </div>
                {serviceData.duration && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Duración</p>
                      <p className={typography.body.base}>{serviceData.duration}</p>
                    </div>
                  </div>
                )}
                {serviceData.description && (
                  <div className={`flex items-start ${spacing.gap.medium} pt-2`}>
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Descripción</p>
                      <p className={typography.body.base}>{serviceData.description}</p>
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
              placeholder="Añadir una nota sobre el servicio..."
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

