"use client";

import { useState, useEffect, useCallback } from "react";
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
  Calendar,
  Clock,
  User,
  Car,
  ShoppingCart,
  Wrench,
  DollarSign,
  Phone,
  Mail,
  Loader2,
  MapPin,
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
import type { AppointmentCard, AppointmentStatus, AppointmentType } from "@/validations/types";

const getStatusBadgeClass = (status: AppointmentStatus) => {
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

const getTypeIcon = (type: AppointmentType) => {
  switch (type) {
    case "prueba":
      return Car;
    case "venta":
      return ShoppingCart;
    case "mantenimiento":
      return Wrench;
  }
};

export default function CalendarDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;
  
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState("");
  const [appointment, setAppointment] = useState<AppointmentCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    status: "pendiente" as AppointmentStatus,
    scheduledAt: "",
    description: "",
  });

  const fetchAppointment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/calendar/${appointmentId}`);
      
      if (response.status === 404) {
        setAppointment(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error("Error al cargar la cita");
      }
      
      const result = await response.json();
      const data = result.data as AppointmentCard;
      setAppointment(data);
      
      // Inicializar formData
      if (data) {
        setFormData({
          status: data.status,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString().slice(0, 16) : "",
          description: data.description || "",
        });
      }
    } catch (err) {
      console.error("Error fetching appointment:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const backButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className="h-10 w-10 flex items-center justify-center rounded-full"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );

  const handleSaveNote = async () => {
    if (!appointment || !note.trim()) return;
    
    try {
      setIsSaving(true);
      const currentNotes = appointment.notes || "";
      const newNotes = currentNotes 
        ? `${currentNotes}\n\n[${new Date().toLocaleString("es-ES")}]\n${note}`
        : `[${new Date().toLocaleString("es-ES")}]\n${note}`;
      
      const response = await fetch(`/api/calendar/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { notes: newNotes } }),
      });
      
      if (!response.ok) {
        throw new Error("Error al guardar la nota");
      }
      
      const result = await response.json();
      setAppointment(result.data);
      setNote("");
    } catch (err) {
      console.error("Error saving note:", err);
      alert(err instanceof Error ? err.message : "Error al guardar la nota");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!appointment) return;
    
    try {
      setIsSaving(true);
      const response = await fetch(`/api/calendar/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            status: formData.status,
            scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
            description: formData.description || undefined,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar la cita");
      }
      
      const result = await response.json();
      setAppointment(result.data);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating appointment:", err);
      alert(err instanceof Error ? err.message : "Error al actualizar la cita");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment || !confirm("¿Estás seguro de que deseas cancelar esta cita?")) return;
    
    try {
      setIsSaving(true);
      const response = await fetch(`/api/calendar/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { status: "cancelada" } }),
      });
      
      if (!response.ok) {
        throw new Error("Error al cancelar la cita");
      }
      
      const result = await response.json();
      setAppointment(result.data);
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      alert(err instanceof Error ? err.message : "Error al cancelar la cita");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!appointment || !confirm("¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.")) return;
    
    try {
      setIsSaving(true);
      const response = await fetch(`/api/calendar/${appointmentId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Error al eliminar la cita");
      }
      
      router.push("/calendar");
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert(err instanceof Error ? err.message : "Error al eliminar la cita");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Cargando..." showFilterAction leftActions={backButton}>
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Error" showFilterAction leftActions={backButton}>
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <section className={`flex flex-col items-center justify-center ${spacing.gap.large} w-full max-w-md px-6`}>
            <p className={`${typography.h3} text-center text-destructive`}>{error}</p>
            <Button 
              onClick={fetchAppointment}
              className="h-14 w-full rounded-xl text-base font-semibold"
              size="lg"
            >
              Reintentar
            </Button>
          </section>
        </div>
      </AdminLayout>
    );
  }

  if (!appointment) {
    return (
      <AdminLayout title="Cita no encontrada" showFilterAction leftActions={backButton}>
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

  const TypeIcon = getTypeIcon(appointment.type);
  const displayName = appointment.clientName || appointment.title || "Sin cliente";
  const contactPhone = appointment.contactPhone || appointment.clientPhone;
  const contactEmail = appointment.contactEmail || appointment.clientEmail;

  return (
    <AdminLayout title={`Cita - ${displayName}`} showFilterAction leftActions={backButton}>
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
                  <DropdownMenuItem 
                    className="cursor-pointer text-orange-600" 
                    onClick={handleCancelAppointment}
                    disabled={isSaving || appointment.status === "cancelada"}
                  >
                    Cancelar Cita
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    variant="destructive" 
                    className="cursor-pointer"
                    onClick={handleDeleteAppointment}
                    disabled={isSaving}
                  >
                    Eliminar Cita
                  </DropdownMenuItem>
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
                {displayName}
              </h2>
              <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                {appointment.typeLabel}
              </p>
              <div className="mt-2">
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(appointment.status)}`}>
                  {appointment.statusLabel}
                </Badge>
              </div>
            </div>

            {/* Botones de acción */}
            <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
              {contactPhone && (
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                  onClick={() => window.location.href = `tel:${contactPhone}`}
                >
                  <Phone className="h-5 w-5 flex-shrink-0" />
                </Button>
              )}
              {contactEmail && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                  onClick={() => window.location.href = `mailto:${contactEmail}`}
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
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as AppointmentStatus })}
                  >
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
                  <Label htmlFor="scheduledAt">Fecha y Hora</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
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
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Guardar Cambios
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditing(false);
                      // Restaurar valores originales
                      if (appointment) {
                        setFormData({
                          status: appointment.status,
                          scheduledAt: appointment.scheduledAt ? new Date(appointment.scheduledAt).toISOString().slice(0, 16) : "",
                          description: appointment.description || "",
                        });
                      }
                    }}
                    disabled={isSaving}
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
                    <p className={typography.body.base}>{appointment.time} {appointment.period}</p>
                  </div>
                </div>
                <div className={`flex items-center ${spacing.gap.medium}`}>
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className={`${typography.body.small} text-muted-foreground`}>Fecha</p>
                    <p className={typography.body.base}>{appointment.scheduledAtLabel}</p>
                  </div>
                </div>
                {appointment.clientName && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <User className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Cliente</p>
                      <p className={typography.body.base}>{appointment.clientName}</p>
                    </div>
                  </div>
                )}
                {appointment.vehicleName && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Vehículo</p>
                      <p className={typography.body.base}>
                        {appointment.vehicleName}
                        {appointment.vehiclePlaca && ` (${appointment.vehiclePlaca})`}
                      </p>
                    </div>
                  </div>
                )}
                {appointment.location && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Ubicación</p>
                      <p className={typography.body.base}>{appointment.location}</p>
                    </div>
                  </div>
                )}
                {appointment.description && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <TypeIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Descripción</p>
                      <p className={typography.body.base}>{appointment.description}</p>
                    </div>
                  </div>
                )}
                {appointment.priceLabel && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Precio/Costo</p>
                      <p className={`${typography.body.base} font-semibold`}>{appointment.priceLabel}</p>
                    </div>
                  </div>
                )}
                {appointment.assignedToName && (
                  <div className={`flex items-center ${spacing.gap.medium}`}>
                    <User className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Asignado a</p>
                      <p className={typography.body.base}>{appointment.assignedToName}</p>
                    </div>
                  </div>
                )}
                {appointment.notes && (
                  <div className={`flex items-start ${spacing.gap.medium} pt-2`}>
                    <div className="flex-1">
                      <p className={`${typography.body.small} text-muted-foreground`}>Notas</p>
                      <p className={`${typography.body.base} whitespace-pre-wrap`}>{appointment.notes}</p>
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
              disabled={!note.trim() || isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Nota
            </Button>
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
}
