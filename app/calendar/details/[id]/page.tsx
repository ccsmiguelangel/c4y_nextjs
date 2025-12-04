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
  Calendar,
  Clock,
  User,
  Car,
  ShoppingCart,
  Wrench,
  DollarSign,
  Phone,
  Mail
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

interface AppointmentData {
  id: string;
  time: string;
  period: "AM" | "PM";
  date: string;
  client: string;
  clientPhone?: string;
  clientEmail?: string;
  type: "venta" | "prueba" | "mantenimiento";
  description: string;
  status: "confirmada" | "pendiente" | "cancelada";
  price?: string;
  vehicle?: string;
  notes?: string;
}

const getAppointmentData = (id: string): AppointmentData | null => {
  const appointments: Record<string, AppointmentData> = {
    "1": {
      id: "1",
      time: "09:00",
      period: "AM",
      date: "2024-10-05",
      client: "Carlos Rodriguez",
      clientPhone: "+34 612 345 678",
      clientEmail: "carlos.rodriguez@email.com",
      type: "prueba",
      description: "Prueba de Conducción - SUV Eléctrico",
      status: "confirmada",
      vehicle: "SUV Eléctrico Modelo X",
      notes: "Cliente interesado en vehículo eléctrico. Preferencia por color azul.",
    },
    "2": {
      id: "2",
      time: "11:30",
      period: "AM",
      date: "2024-10-05",
      client: "Laura Gómez",
      clientPhone: "+34 698 765 432",
      clientEmail: "laura.gomez@email.com",
      type: "venta",
      description: "Venta - Sedán Híbrido",
      status: "pendiente",
      price: "Cotización: $42,500",
      vehicle: "Sedán Híbrido Modelo Y",
      notes: "Cliente requiere financiamiento. Revisar opciones disponibles.",
    },
    "3": {
      id: "3",
      time: "02:00",
      period: "PM",
      date: "2024-10-05",
      client: "Javier Fernández",
      clientPhone: "+34 611 222 333",
      clientEmail: "javier.fernandez@email.com",
      type: "mantenimiento",
      description: "Mantenimiento - 50.000km",
      status: "confirmada",
      price: "Costo: $350",
      vehicle: "Toyota RAV4 2022",
      notes: "Mantenimiento programado. Revisar disponibilidad de repuestos.",
    },
    "4": {
      id: "4",
      time: "04:30",
      period: "PM",
      date: "2024-10-05",
      client: "Miguel Torres",
      clientPhone: "+34 644 555 666",
      clientEmail: "miguel.torres@email.com",
      type: "prueba",
      description: "Prueba de Conducción - Coupé Deportivo",
      status: "cancelada",
      vehicle: "Coupé Deportivo Modelo Z",
      notes: "Cliente canceló por cambio de planes. Reagendar para próxima semana.",
    },
  };
  return appointments[id] || null;
};

const getStatusBadgeClass = (status: AppointmentData["status"]) => {
  switch (status) {
    case "confirmada":
      return "bg-green-100 text-green-700";
    case "pendiente":
      return "bg-orange-100 text-orange-700";
    case "cancelada":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusLabel = (status: AppointmentData["status"]) => {
  switch (status) {
    case "confirmada":
      return "Confirmada";
    case "pendiente":
      return "Pendiente";
    case "cancelada":
      return "Cancelada";
  }
};

const getTypeIcon = (type: AppointmentData["type"]) => {
  switch (type) {
    case "prueba":
      return Car;
    case "venta":
      return ShoppingCart;
    case "mantenimiento":
      return Wrench;
  }
};

const getTypeLabel = (type: AppointmentData["type"]) => {
  switch (type) {
    case "prueba":
      return "Prueba de Conducción";
    case "venta":
      return "Venta";
    case "mantenimiento":
      return "Mantenimiento";
  }
};

export default function CalendarDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState("");
  const [formData, setFormData] = useState({
    status: "confirmada" as AppointmentData["status"],
    time: "",
    date: "",
    description: "",
  });

  const appointmentData = getAppointmentData(appointmentId);

  // Inicializar formData cuando se carga la cita
  useEffect(() => {
    if (appointmentData && !formData.time) {
      setFormData({
        status: appointmentData.status,
        time: appointmentData.time,
        date: appointmentData.date,
        description: appointmentData.description,
      });
    }
  }, [appointmentData]);

  if (!appointmentData) {
    return (
      <AdminLayout title="Cita no encontrada" showFilterAction>
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <section className={`flex flex-col items-center justify-center ${spacing.gap.large} w-full max-w-md px-6`}>
            <p className={`${typography.h3} text-center`}>La cita solicitada no existe.</p>
            <Button 
              onClick={() => router.push("/calendar")}
              className="h-14 w-full rounded-xl text-base font-semibold"
              size="lg"
            >
              Volver a Agenda
            </Button>
          </section>
        </div>
      </AdminLayout>
    );
  }

  const handleSaveNote = () => {
    console.log("Nota guardada:", note, "para cita:", appointmentId);
    setNote("");
  };

  const handleSaveChanges = () => {
    console.log("Cambios guardados:", formData, "para cita:", appointmentId);
    setIsEditing(false);
  };

  const TypeIcon = getTypeIcon(appointmentData.type);

  return (
    <AdminLayout title={`Cita - ${appointmentData.client}`} showFilterAction>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Información de la Cita */}
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
                    Editar Cita
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" className="cursor-pointer">
                    Cancelar Cita
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Icono y Tipo */}
            <div className={`flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mt-8`}>
              <TypeIcon className="h-8 w-8" />
            </div>

            {/* Cliente y Badge */}
            <div className="flex flex-col items-center text-center">
              <h2 className={`${typography.h3} text-center`}>
                {appointmentData.client}
              </h2>
              <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                {getTypeLabel(appointmentData.type)}
              </p>
              <div className="mt-2">
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(appointmentData.status)}`}>
                  {getStatusLabel(appointmentData.status)}
                </Badge>
              </div>
            </div>

            {/* Botones de acción */}
            <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
              {appointmentData.clientPhone && (
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                  onClick={() => window.location.href = `tel:${appointmentData.clientPhone}`}
                >
                  <Phone className="h-5 w-5 flex-shrink-0" />
                </Button>
              )}
              {appointmentData.clientEmail && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                  onClick={() => window.location.href = `mailto:${appointmentData.clientEmail}`}
                >
                  <Mail className="h-5 w-5 flex-shrink-0" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-5 w-5 flex-shrink-0" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información Detallada */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Detalles de la Cita</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            {isEditing ? (
              <>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as AppointmentData["status"] })}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="time">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className={`flex flex-col ${spacing.gap.small}`}>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
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
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Hora</p>
                    <p className={typography.body.base}>{appointmentData.time} {appointmentData.period}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Fecha</p>
                    <p className={typography.body.base}>{new Date(appointmentData.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Cliente</p>
                    <p className={typography.body.base}>{appointmentData.client}</p>
                  </div>
                </div>
                {appointmentData.vehicle && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Vehículo</p>
                      <p className={typography.body.base}>{appointmentData.vehicle}</p>
                    </div>
                  </div>
                )}
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <TypeIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Descripción</p>
                    <p className={typography.body.base}>{appointmentData.description}</p>
                  </div>
                </div>
                {appointmentData.price && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Precio/Costo</p>
                      <p className={`${typography.body.base} font-semibold`}>{appointmentData.price}</p>
                    </div>
                  </div>
                )}
                {appointmentData.notes && (
                  <div className={`flex items-start ${spacing.gap.medium} pt-2`}>
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Notas</p>
                      <p className={typography.body.base}>{appointmentData.notes}</p>
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
            <CardTitle className={typography.h4}>Notas Adicionales</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            <Textarea
              placeholder="Añadir una nota sobre la cita..."
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

