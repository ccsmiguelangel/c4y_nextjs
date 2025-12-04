"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent } from "@/components_shadcn/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components_shadcn/ui/toggle-group";
import { Separator } from "@/components_shadcn/ui/separator";
import { Badge } from "@/components_shadcn/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { ChevronLeft, ChevronRight, Plus, MoreVertical, Car, ShoppingCart, Wrench, ChevronRight as ChevronRightIcon } from "lucide-react";
import { typography, spacing, commonClasses } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

type AppointmentType = "all" | "venta" | "prueba" | "mantenimiento";

interface Appointment {
  id: string;
  time: string;
  period: "AM" | "PM";
  client: string;
  type: "venta" | "prueba" | "mantenimiento";
  description: string;
  status: "confirmada" | "pendiente" | "cancelada";
  price?: string;
  icon: "car" | "sell" | "maintenance";
  iconColor: "green" | "orange" | "blue" | "red";
  opacity?: number;
  day?: number;
}

export default function CalendarPage() {
  const router = useRouter();
  const [viewType, setViewType] = useState<"monthly" | "weekly">("monthly");
  const [selectedFilter, setSelectedFilter] = useState<AppointmentType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 9, 1)); // Octubre 2024
  const [currentWeek, setCurrentWeek] = useState(0); // Semana actual (0 = primera semana del mes)
  const [selectedDay, setSelectedDay] = useState<number | null>(5); // Día seleccionado

  const appointments: Appointment[] = [
    {
      id: "1",
      time: "09:00",
      period: "AM",
      client: "Carlos Rodriguez",
      type: "prueba",
      description: "Prueba de Conducción - SUV Eléctrico",
      status: "confirmada",
      icon: "car",
      iconColor: "green",
      day: 5,
    },
    {
      id: "2",
      time: "11:30",
      period: "AM",
      client: "Laura Gómez",
      type: "venta",
      description: "Venta - Sedán Híbrido",
      status: "pendiente",
      price: "Cotización: $42,500",
      icon: "sell",
      iconColor: "orange",
      day: 5,
    },
    {
      id: "3",
      time: "02:00",
      period: "PM",
      client: "Javier Fernández",
      type: "mantenimiento",
      description: "Mantenimiento - 50.000km",
      status: "confirmada",
      price: "Costo: $350",
      icon: "maintenance",
      iconColor: "blue",
      day: 5,
    },
    {
      id: "4",
      time: "04:30",
      period: "PM",
      client: "Miguel Torres",
      type: "prueba",
      description: "Prueba de Conducción - Coupé Deportivo",
      status: "cancelada",
      icon: "car",
      iconColor: "red",
      opacity: 0.6,
      day: 5,
    },
    {
      id: "5",
      time: "10:00",
      period: "AM",
      client: "Ana Martínez",
      type: "venta",
      description: "Venta - Coupé Deportivo",
      status: "confirmada",
      price: "Cotización: $38,000",
      icon: "sell",
      iconColor: "green",
      day: 11,
    },
    {
      id: "6",
      time: "03:00",
      period: "PM",
      client: "Pedro Sánchez",
      type: "mantenimiento",
      description: "Mantenimiento - 30.000km",
      status: "pendiente",
      price: "Costo: $280",
      icon: "maintenance",
      iconColor: "orange",
      day: 16,
    },
    {
      id: "7",
      time: "09:30",
      period: "AM",
      client: "María López",
      type: "prueba",
      description: "Prueba de Conducción - SUV Híbrido",
      status: "confirmada",
      icon: "car",
      iconColor: "green",
      day: 24,
    },
  ];

  // Calcular días con citas dinámicamente
  const daysWithAppointments = Array.from(
    new Set(appointments.map(apt => apt.day).filter((day): day is number => day !== undefined))
  );

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
    setCurrentWeek(0);
    // Mantener el día seleccionado si existe en el nuevo mes, sino seleccionar el día 1
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
    // Mantener el día seleccionado si existe en el nuevo mes, sino seleccionar el día 1
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
      // Cambiar al mes anterior
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
      // Cambiar al mes siguiente
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      setCurrentMonth(nextMonth);
      setCurrentWeek(0);
    }
  };

  // Calcular días de la semana actual
  const getWeekDays = () => {
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    const startDate = currentWeek * 7 - firstDayOfWeek + 1;
    const weekDays: Array<{ day: number; isCurrentMonth: boolean }> = [];
    
    for (let i = 0; i < 7; i++) {
      const day = startDate + i;
      if (day < 1) {
        // Día del mes anterior
        const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
        weekDays.push({ day: prevMonthDays + day, isCurrentMonth: false });
      } else if (day > daysInMonth) {
        // Día del mes siguiente
        weekDays.push({ day: day - daysInMonth, isCurrentMonth: false });
      } else {
        weekDays.push({ day, isCurrentMonth: true });
      }
    }
    
    return weekDays;
  };

  const weekDays = getWeekDays();
  
  // Calcular el primer día del mes para la vista mensual
  const getFirstDayOfMonth = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return firstDay.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  };

  const firstDayOfMonth = getFirstDayOfMonth();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  
  const handleDayClick = (day: number, isCurrentMonth: boolean = true) => {
    if (isCurrentMonth) {
      setSelectedDay(day);
    } else {
      // Si es un día de otro mes, cambiar al mes correspondiente
      if (day > 15) {
        // Es del mes anterior
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day);
        setCurrentMonth(newMonth);
        setSelectedDay(day);
        // Calcular la semana correspondiente
        const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1).getDay();
        const weekIndex = Math.floor((day + firstDay - 1) / 7);
        setCurrentWeek(weekIndex);
      } else {
        // Es del mes siguiente
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

  const getStatusBadgeClass = (status: Appointment["status"]) => {
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

  const getFilterButtonClass = (filterId: AppointmentType) => {
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

  const getIconColorClass = (color: Appointment["iconColor"]) => {
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

  const filteredAppointments = appointments.filter(apt => {
    // Filtrar por tipo
    const matchesFilter = selectedFilter === "all" || apt.type === selectedFilter;
    
    // Filtrar por búsqueda (cliente, descripción, precio)
    const matchesSearch = searchQuery === "" || 
      apt.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.price && apt.price.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtrar por día seleccionado
    let matchesDay = false;
    if (viewType === "monthly") {
      // En vista mensual, mostrar citas del día seleccionado
      matchesDay = selectedDay !== null && apt.day === selectedDay;
    } else {
      // En vista semanal, mostrar citas de los días de la semana actual
      const weekDayNumbers = weekDays.map(wd => wd.day);
      matchesDay = apt.day !== undefined && weekDayNumbers.includes(apt.day);
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
                  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                  const isFirstDayFromPrevMonth = !firstDayObj.isCurrentMonth && firstDay > 7;
                  const isLastDayFromNextMonth = !lastDayObj.isCurrentMonth && lastDay < 7;
                  
                  if (isFirstDayFromPrevMonth) {
                    const prevMonthName = monthNames[(currentMonth.getMonth() - 1 + 12) % 12];
                    const prevYear = currentMonth.getMonth() === 0 ? currentMonth.getFullYear() - 1 : currentMonth.getFullYear();
                    return `${prevMonthName} ${firstDay} - ${monthName} ${lastDay} ${year}`;
                  } else if (isLastDayFromNextMonth) {
                    const nextMonthName = monthNames[(currentMonth.getMonth() + 1) % 12];
                    const nextYear = currentMonth.getMonth() === 11 ? currentMonth.getFullYear() + 1 : currentMonth.getFullYear();
                    return `${monthName} ${firstDay} - ${nextMonthName} ${lastDay} ${nextYear}`;
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
          <div className={`flex items-center ${spacing.gap.small} w-full justify-center overflow-x-auto`}>
            {[
              { id: "all" as AppointmentType, label: "Todos" },
              { id: "venta" as AppointmentType, label: "Venta" },
              { id: "prueba" as AppointmentType, label: "Prueba de Conducción" },
              { id: "mantenimiento" as AppointmentType, label: "Mantenimiento" },
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
            {filteredAppointments.length === 0 ? (
              <p className={typography.body.small}>No hay citas para mostrar</p>
            ) : (
              <ol className={`flex flex-col ${spacing.gap.base}`}>
                {filteredAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    onClick={() => router.push(`/calendar/details/${appointment.id}`)}
                    className={`flex items-start ${spacing.gap.medium} rounded-xl bg-card ${spacing.card.padding} ${commonClasses.card} cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted ${
                      appointment.opacity ? `opacity-${Math.round(appointment.opacity * 100)}` : ""
                    }`}
                    style={appointment.opacity ? { opacity: appointment.opacity } : undefined}
                  >
                    <time className="flex w-16 flex-col items-center" dateTime={`2024-10-05T${appointment.time}`}>
                      <span className={typography.body.base}>{appointment.time}</span>
                      <span className={typography.body.small}>{appointment.period}</span>
                    </time>
                    <Separator orientation="vertical" className="h-auto" />
                    <div className="flex-1">
                      <h3 className={`${typography.h4} ${appointment.status === "cancelada" ? "line-through" : ""}`}>
                        {appointment.client}
                      </h3>
                      <p className={`flex items-center ${spacing.gap.small} ${typography.body.base} text-muted-foreground`}>
                        {appointment.icon === "car" && <Car className={`text-base ${getIconColorClass(appointment.iconColor)}`} />}
                        {appointment.icon === "sell" && <ShoppingCart className={`text-base ${getIconColorClass(appointment.iconColor)}`} />}
                        {appointment.icon === "maintenance" && <Wrench className={`text-base ${getIconColorClass(appointment.iconColor)}`} />}
                        {appointment.description}
                      </p>
                      <div className={`mt-2 flex items-center ${appointment.price ? "justify-between" : spacing.gap.small}`}>
                        <Badge className={getStatusBadgeClass(appointment.status)}>
                          {appointment.status === "confirmada" ? "Confirmada" : appointment.status === "pendiente" ? "Pendiente" : "Cancelada"}
                        </Badge>
                        {appointment.price && (
                          <p className={typography.body.base}>{appointment.price}</p>
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
                        <span className="sr-only">Más opciones para {appointment.client}</span>
                      </Button>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </article>
                ))}
              </ol>
            )}
          </div>
        </section>

      <Button
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
        size="icon"
        aria-label="Agregar nueva cita"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </AdminLayout>
  );
}
