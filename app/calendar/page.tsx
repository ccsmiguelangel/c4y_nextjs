"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components_shadcn/ui/toggle-group";
import { Separator } from "@/components_shadcn/ui/separator";
import { Badge } from "@/components_shadcn/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { ChevronLeft, ChevronRight, MoreVertical, Car, ShoppingCart, Wrench, ChevronRight as ChevronRightIcon, Loader2 } from "lucide-react";
import { typography, spacing, commonClasses } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { 
  AddAppointmentButton, 
  CreateAppointmentDialog, 
  initialFormData,
  type CreateAppointmentFormData 
} from "./components/calendar-dialogs";
import type { AppointmentCard, AppointmentType as AppointmentTypeEnum, AppointmentStatus } from "@/validations/types";

type AppointmentFilterType = "all" | AppointmentTypeEnum;

// Helper para obtener el icono del tipo
const getTypeIcon = (type: AppointmentTypeEnum) => {
  switch (type) {
    case "prueba":
      return "car";
    case "venta":
      return "sell";
    case "mantenimiento":
      return "maintenance";
    default:
      return "car";
  }
};

// Helper para obtener el color del icono basado en tipo y estado
const getIconColor = (type: AppointmentTypeEnum, status: AppointmentStatus) => {
  if (status === "cancelada") return "red";
  switch (type) {
    case "prueba":
      return "green";
    case "venta":
      return "orange";
    case "mantenimiento":
      return "blue";
    default:
      return "green";
  }
};

export default function CalendarPage() {
  const router = useRouter();
  const [viewType, setViewType] = useState<"monthly" | "weekly">("monthly");
  const [selectedFilter, setSelectedFilter] = useState<AppointmentFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  
  // Estado para datos de Strapi
  const [appointments, setAppointments] = useState<AppointmentCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para el diálogo de crear cita
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateAppointmentFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch de citas desde la API
  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/calendar");
      if (!response.ok) {
        throw new Error("Error al cargar las citas");
      }
      const result = await response.json();
      setAppointments(result.data || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Validación del formulario de creación
  const isFormValid = Boolean(
    createFormData.type && 
    createFormData.scheduledDate && 
    createFormData.scheduledTime
  );

  // Función para crear una nueva cita
  const handleCreateAppointment = async () => {
    if (!isFormValid) return;
    
    try {
      setIsCreating(true);
      
      // Construir el datetime ISO
      const scheduledAt = new Date(
        `${createFormData.scheduledDate}T${createFormData.scheduledTime}:00`
      ).toISOString();
      
      const payload = {
        data: {
          type: createFormData.type,
          status: createFormData.status,
          scheduledAt,
          title: createFormData.title || undefined,
          description: createFormData.description || undefined,
          price: createFormData.price ? parseFloat(createFormData.price) : undefined,
          durationMinutes: createFormData.durationMinutes ? parseInt(createFormData.durationMinutes, 10) : undefined,
          location: createFormData.location || undefined,
          contactPhone: createFormData.contactPhone || undefined,
          contactEmail: createFormData.contactEmail || undefined,
          notes: createFormData.notes || undefined,
        },
      };
      
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear la cita");
      }
      
      // Cerrar el diálogo y recargar las citas
      setIsCreateDialogOpen(false);
      setCreateFormData(initialFormData);
      await fetchAppointments();
    } catch (err) {
      console.error("Error creating appointment:", err);
      alert(err instanceof Error ? err.message : "Error al crear la cita");
    } finally {
      setIsCreating(false);
    }
  };

  // Cancelar creación
  const handleCancelCreate = () => {
    setIsCreateDialogOpen(false);
    setCreateFormData(initialFormData);
  };

  // Filtrar citas por mes actual
  const appointmentsInCurrentMonth = appointments.filter(apt => {
    return apt.month === currentMonth.getMonth() && apt.year === currentMonth.getFullYear();
  });

  // Calcular días con citas dinámicamente
  const daysWithAppointments = Array.from(
    new Set(appointmentsInCurrentMonth.map(apt => apt.day))
  );

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
    setCurrentWeek(0);
    const daysInNewMonth = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0).getDate();
    if (selectedDay && selectedDay <= daysInNewMonth) {
      // Mantener el día seleccionado
    } else {
      setSelectedDay(1);
    }
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
    setCurrentWeek(0);
    const daysInNewMonth = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0).getDate();
    if (selectedDay && selectedDay <= daysInNewMonth) {
      // Mantener el día seleccionado
    } else {
      setSelectedDay(1);
    }
  };

  const handlePreviousWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(currentWeek - 1);
    } else {
      const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const daysInPreviousMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0).getDate();
      const firstDayOfWeek = previousMonth.getDay();
      const weeksInPreviousMonth = Math.ceil((daysInPreviousMonth + firstDayOfWeek) / 7);
      setCurrentMonth(previousMonth);
      setCurrentWeek(weeksInPreviousMonth - 1);
    }
  };

  const handleNextWeek = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const weeksInMonth = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
    
    if (currentWeek < weeksInMonth - 1) {
      setCurrentWeek(currentWeek + 1);
    } else {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      setCurrentMonth(nextMonth);
      setCurrentWeek(0);
    }
  };

  const getWeekDays = () => {
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    const startDate = currentWeek * 7 - firstDayOfWeek + 1;
    const weekDays: Array<{ day: number; isCurrentMonth: boolean }> = [];
    
    for (let i = 0; i < 7; i++) {
      const day = startDate + i;
      if (day < 1) {
        const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
        weekDays.push({ day: prevMonthDays + day, isCurrentMonth: false });
      } else if (day > daysInMonth) {
        weekDays.push({ day: day - daysInMonth, isCurrentMonth: false });
      } else {
        weekDays.push({ day, isCurrentMonth: true });
      }
    }
    
    return weekDays;
  };

  const weekDays = getWeekDays();
  
  const getFirstDayOfMonth = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return firstDay.getDay();
  };

  const firstDayOfMonth = getFirstDayOfMonth();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  
  const handleDayClick = (day: number, isCurrentMonth: boolean = true) => {
    if (isCurrentMonth) {
      setSelectedDay(day);
    } else {
      if (day > 15) {
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
        setCurrentMonth(newMonth);
        setSelectedDay(day);
        const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1).getDay();
        const weekIndex = Math.floor((day + firstDay - 1) / 7);
        setCurrentWeek(weekIndex);
      } else {
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day);
        setCurrentMonth(newMonth);
        setSelectedDay(day);
        setCurrentWeek(0);
      }
    }
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const monthName = monthNames[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  const getStatusBadgeClass = (status: AppointmentStatus) => {
    switch (status) {
      case "confirmada":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "pendiente":
        return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
      case "cancelada":
        return "bg-red-500/20 text-red-600 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getFilterButtonClass = (filterId: AppointmentFilterType) => {
    const isActive = selectedFilter === filterId;
    const baseClass = "h-8 shrink-0 px-3 rounded-lg transition-colors";
    
    if (!isActive) {
      return `${baseClass} bg-muted text-muted-foreground hover:bg-muted/80`;
    }
    
    switch (filterId) {
      case "all":
        return `${baseClass} bg-muted text-foreground`;
      case "venta":
        return `${baseClass} bg-orange-500 text-white hover:bg-orange-600`;
      case "prueba":
        return `${baseClass} bg-green-500 text-white hover:bg-green-600`;
      case "mantenimiento":
        return `${baseClass} bg-blue-500 text-white hover:bg-blue-600`;
      default:
        return `${baseClass} bg-muted text-foreground`;
    }
  };

  const getIconColorClass = (color: string) => {
    switch (color) {
      case "green":
        return "text-green-500";
      case "orange":
        return "text-orange-500";
      case "blue":
        return "text-blue-500";
      case "red":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const filteredAppointments = appointmentsInCurrentMonth.filter(apt => {
    // Filtrar por tipo
    const matchesFilter = selectedFilter === "all" || apt.type === selectedFilter;
    
    // Filtrar por búsqueda (cliente, descripción, precio)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      (apt.clientName?.toLowerCase().includes(searchLower)) ||
      (apt.description?.toLowerCase().includes(searchLower)) ||
      (apt.priceLabel?.toLowerCase().includes(searchLower)) ||
      (apt.title?.toLowerCase().includes(searchLower));
    
    // Filtrar por día seleccionado o semana
    let matchesDay = false;
    if (viewType === "monthly") {
      matchesDay = selectedDay !== null && apt.day === selectedDay;
    } else {
      const weekDayNumbers = weekDays.filter(wd => wd.isCurrentMonth).map(wd => wd.day);
      matchesDay = weekDayNumbers.includes(apt.day);
    }
    
    return matchesFilter && matchesSearch && matchesDay;
  });

  return (
    <AdminLayout
      title="Calendario"
      showFilterAction
    >
        <div className="flex justify-center" aria-label="Tipo de vista">
          <ToggleGroup
            type="single"
            value={viewType}
            onValueChange={(value) => {
              if (value) setViewType(value as "monthly" | "weekly");
            }}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-muted p-1"
          >
            <ToggleGroupItem
              value="monthly"
              aria-label="Vista Mensual"
              className={`flex h-full grow items-center justify-center px-2 rounded-md transition-colors ${
                viewType === "monthly" 
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <span className={`truncate ${typography.body.base}`}>Vista Mensual</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="weekly"
              aria-label="Vista Semanal"
              className={`flex h-full grow items-center justify-center px-2 rounded-md transition-colors ${
                viewType === "weekly" 
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <span className={`truncate ${typography.body.base}`}>Vista Semanal</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <section className="flex justify-center" aria-label="Calendario">
        <Card className={`w-full flex flex-col gap-0.5 ${commonClasses.card}`}>
          <CardContent className={`flex items-center justify-between p-3 ${spacing.gap.medium}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={viewType === "monthly" ? handlePreviousMonth : handlePreviousWeek}
              className="size-10 shrink-0 rounded-full hover:bg-muted flex-shrink-0 flex items-center justify-center"
              aria-label={viewType === "monthly" ? "Mes anterior" : "Semana anterior"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <time className={`flex-1 text-center ${typography.h4} whitespace-nowrap px-2`} dateTime={`${year}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`}>
              {viewType === "weekly" && weekDays.length > 0 ? (
                (() => {
                  const firstDayObj = weekDays[0];
                  const lastDayObj = weekDays[6];
                  const firstDay = firstDayObj.day;
                  const lastDay = lastDayObj.day;
                  const isFirstDayFromPrevMonth = !firstDayObj.isCurrentMonth && firstDay > 7;
                  const isLastDayFromNextMonth = !lastDayObj.isCurrentMonth && lastDay < 7;
                  
                  if (isFirstDayFromPrevMonth) {
                    const prevMonthName = monthNames[(currentMonth.getMonth() - 1 + 12) % 12];
                    return `${prevMonthName} ${firstDay} - ${monthName} ${lastDay} ${year}`;
                  } else if (isLastDayFromNextMonth) {
                    const nextMonthName = monthNames[(currentMonth.getMonth() + 1) % 12];
                    return `${monthName} ${firstDay} - ${nextMonthName} ${lastDay} ${year}`;
                  } else {
                    return `${monthName} ${firstDay} - ${lastDay} ${year}`;
                  }
                })()
              ) : (
                `${monthName} ${year}`
              )}
            </time>
            <Button
              variant="ghost"
              size="icon"
              onClick={viewType === "monthly" ? handleNextMonth : handleNextWeek}
              className="size-10 shrink-0 rounded-full hover:bg-muted flex-shrink-0 flex items-center justify-center"
              aria-label={viewType === "monthly" ? "Mes siguiente" : "Semana siguiente"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
          <CardContent className="p-3">
            {viewType === "monthly" ? (
              <ol className={`grid grid-cols-7 ${spacing.gap.small}`} role="grid">
                {["D", "L", "M", "M", "J", "V", "S"].map((day, index) => (
                  <li key={index} className={`flex h-14 w-full items-center justify-center pb-0.5 ${typography.body.base} font-bold tracking-[0.015em] text-muted-foreground`} role="columnheader">
                    {day}
                  </li>
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const hasAppointment = daysWithAppointments.includes(day);
                  const isSelected = day === selectedDay;
                  const gridColumnStart = day === 1 ? (firstDayOfMonth === 0 ? 7 : firstDayOfMonth) : undefined;
                  return (
                    <li 
                      key={day} 
                      style={gridColumnStart ? { gridColumnStart } : undefined}
                    >
                      <button
                        onClick={() => handleDayClick(day)}
                        className={`relative flex h-14 w-full items-center justify-center rounded-full ${typography.body.large} transition-colors ${
                          isSelected 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "text-foreground hover:bg-muted"
                        }`}
                        aria-label={`Día ${day}${hasAppointment ? ", tiene citas" : ""}`}
                        aria-current={isSelected ? "date" : undefined}
                      >
                        {day}
                        {hasAppointment && !isSelected && (
                          <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        )}
                        {hasAppointment && isSelected && (
                          <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <ol className={`grid grid-cols-7 ${spacing.gap.small}`} role="grid">
                {["D", "L", "M", "M", "J", "V", "S"].map((day, index) => (
                  <li key={index} className={`flex h-14 w-full items-center justify-center pb-0.5 ${typography.body.base} font-bold tracking-[0.015em] text-muted-foreground`} role="columnheader">
                    {day}
                  </li>
                ))}
                {weekDays.map((weekDay, index) => {
                  const hasAppointment = weekDay.isCurrentMonth && daysWithAppointments.includes(weekDay.day);
                  const isSelected = weekDay.isCurrentMonth && weekDay.day === selectedDay;
                  return (
                    <li key={`${weekDay.day}-${index}`}>
                      <button
                        onClick={() => handleDayClick(weekDay.day, weekDay.isCurrentMonth)}
                        className={`relative flex h-14 w-full items-center justify-center rounded-full ${typography.body.large} transition-colors ${
                          isSelected 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : weekDay.isCurrentMonth 
                              ? "text-foreground hover:bg-muted" 
                              : "text-muted-foreground opacity-50 hover:opacity-70"
                        }`}
                        aria-label={`Día ${weekDay.day}${hasAppointment ? ", tiene citas" : ""}`}
                        aria-current={isSelected ? "date" : undefined}
                      >
                        {weekDay.day}
                        {hasAppointment && !isSelected && (
                          <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        )}
                        {hasAppointment && isSelected && (
                          <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
        </section>

        <div className="flex items-center justify-center" aria-label="Filtros de citas">
          <ScrollAreaPrimitive.Root className="relative w-full overflow-hidden">
            <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] scroll-smooth">
              <div className={`flex items-center ${spacing.gap.small} w-full justify-center whitespace-nowrap`}>
            {[
              { id: "all" as AppointmentFilterType, label: "Todos" },
              { id: "venta" as AppointmentFilterType, label: "Venta" },
              { id: "prueba" as AppointmentFilterType, label: "Prueba de Conducción" },
              { id: "mantenimiento" as AppointmentFilterType, label: "Mantenimiento" },
            ].map((filter) => (
              <Button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                aria-label={filter.label}
                className={`${getFilterButtonClass(filter.id)} flex items-center justify-center`}
                variant="ghost"
              >
                <span className={typography.body.base}>{filter.label}</span>
              </Button>
            ))}
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.ScrollAreaScrollbar
              orientation="horizontal"
              className="flex touch-none select-none transition-colors w-full h-2.5 border-t border-t-transparent p-[1px]"
            >
              <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/75 hover:bg-border/90 dark:bg-border/65 dark:hover:bg-border/85 transition-colors" />
            </ScrollAreaPrimitive.ScrollAreaScrollbar>
            <ScrollAreaPrimitive.Corner />
          </ScrollAreaPrimitive.Root>
        </div>

        <SearchInput
          variant="muted"
          placeholder="Buscar por cliente, descripción o precio..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Buscar citas"
        />

        <section className={`flex flex-col items-center ${spacing.gap.base} pb-24`}>
          <div className={`w-full flex flex-col ${spacing.gap.base}`}>
            <h2 className={typography.h2}>
              {viewType === "weekly" 
                ? `Citas de la Semana`
                : selectedDay 
                  ? `Citas para el ${selectedDay} de ${monthName}`
                  : "Selecciona un día"
              }
            </h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className={`${typography.body.base} text-destructive`}>{error}</p>
                <Button onClick={fetchAppointments} variant="outline">
                  Reintentar
                </Button>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <p className={typography.body.small}>No hay citas para mostrar</p>
            ) : (
              <ol className={`flex flex-col ${spacing.gap.base}`}>
                {filteredAppointments.map((appointment) => {
                  const iconType = getTypeIcon(appointment.type);
                  const iconColor = getIconColor(appointment.type, appointment.status);
                  const isCancelled = appointment.status === "cancelada";
                  
                  return (
                    <article
                      key={appointment.id}
                      onClick={() => router.push(`/calendar/details/${appointment.documentId}`)}
                      className={`flex items-start ${spacing.gap.medium} rounded-xl bg-card ${spacing.card.padding} ${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted`}
                      style={isCancelled ? { opacity: 0.6 } : undefined}
                    >
                      <time className="flex w-16 flex-col items-center" dateTime={appointment.scheduledAt}>
                        <span className={typography.body.base}>{appointment.time}</span>
                        <span className={typography.body.small}>{appointment.period}</span>
                      </time>
                      <Separator orientation="vertical" className="h-auto" />
                      <div className="flex-1">
                        <h3 className={`${typography.h4} ${isCancelled ? "line-through" : ""}`}>
                          {appointment.clientName || appointment.title || "Sin cliente"}
                        </h3>
                        <p className={`flex items-center ${spacing.gap.small} ${typography.body.base} text-muted-foreground`}>
                          {iconType === "car" && <Car className={`text-base ${getIconColorClass(iconColor)}`} />}
                          {iconType === "sell" && <ShoppingCart className={`text-base ${getIconColorClass(iconColor)}`} />}
                          {iconType === "maintenance" && <Wrench className={`text-base ${getIconColorClass(iconColor)}`} />}
                          {appointment.description || appointment.typeLabel}
                        </p>
                        <div className={`mt-2 flex items-center ${appointment.priceLabel ? "justify-between" : spacing.gap.small}`}>
                          <Badge className={getStatusBadgeClass(appointment.status)}>
                            {appointment.statusLabel}
                          </Badge>
                          {appointment.priceLabel && (
                            <p className={typography.body.base}>{appointment.priceLabel}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 shrink-0 rounded-full hover:bg-muted flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); }}
                        >
                          <MoreVertical className="h-5 w-5 text-muted-foreground" />
                          <span className="sr-only">Más opciones para {appointment.clientName || appointment.title}</span>
                        </Button>
                        <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </article>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

      <AddAppointmentButton onClick={() => setIsCreateDialogOpen(true)} />
      
      <CreateAppointmentDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={createFormData}
        setFormData={setCreateFormData}
        isCreating={isCreating}
        isFormValid={isFormValid}
        onConfirm={handleCreateAppointment}
        onCancel={handleCancelCreate}
      />
    </AdminLayout>
  );
}
