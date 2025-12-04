"use client";

import { Card, CardContent } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components_shadcn/ui/tabs";
import { Archive, CheckCheck, UserPlus, Sparkles, Calendar, Receipt, Car } from "lucide-react";
import { useState } from "react";
import { commonClasses, spacing, typography, colors } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  type: "lead" | "sale" | "reminder" | "payment" | "inventory";
  icon: typeof UserPlus;
  iconBgColor: string;
  iconColor: string;
}

const notifications: Notification[] = [
  {
    id: "1",
    title: "Nuevo Lead Asignado",
    description: "Juan Pérez, interesado en Ford Mustang",
    timestamp: "Hace 5 min",
    isRead: false,
    type: "lead",
    icon: UserPlus,
    iconBgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    id: "2",
    title: "¡Venta Completada!",
    description: "Venta completada para el vehículo #78910",
    timestamp: "Hace 30 min",
    isRead: false,
    type: "sale",
    icon: Sparkles,
    iconBgColor: "bg-green-500/10",
    iconColor: "text-green-600",
  },
  {
    id: "3",
    title: "Recordatorio: Cita con cliente",
    description: "Reunión de seguimiento a las 16:00h",
    timestamp: "Ayer a las 15:30",
    isRead: true,
    type: "reminder",
    icon: Calendar,
    iconBgColor: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  {
    id: "4",
    title: "Alerta de Pago Pendiente",
    description: "El pago de la factura #8432 está pendiente",
    timestamp: "Hace 3 días",
    isRead: true,
    type: "payment",
    icon: Receipt,
    iconBgColor: "bg-red-500/10",
    iconColor: "text-red-600",
  },
  {
    id: "5",
    title: "Actualización de Inventario",
    description: "Nuevo vehículo Ford Bronco añadido al stock",
    timestamp: "Hace 5 días",
    isRead: true,
    type: "inventory",
    icon: Car,
    iconBgColor: "bg-muted",
    iconColor: "text-muted-foreground",
  },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"notifications" | "archived">("notifications");
  const [notificationList, setNotificationList] = useState<Notification[]>(notifications);

  const handleMarkAllAsRead = () => {
    setNotificationList((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
  };

  const displayedNotifications =
    activeTab === "archived"
      ? notificationList.filter((n) => n.isRead)
      : notificationList;

  const unreadCount = notificationList.filter((n) => !n.isRead).length;

  return (
    <AdminLayout title="Centro de Notificaciones">
      {/* Tabs */}
      <div className="px-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "notifications" | "archived")}>
          <TabsList className="flex items-center justify-center w-full bg-transparent p-0 h-auto border-0 shadow-none gap-2">
            <TabsTrigger
              value="archived"
              className="flex items-center gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <Archive className="h-4 w-4" />
              <span className={typography.body.base}>Archivadas</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              <span className={typography.body.base}>Notificaciones</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista de Notificaciones */}
      <div className={`flex flex-col ${spacing.gap.medium} px-0 pb-28`}>
        {displayedNotifications.length === 0 ? (
          <Card className={commonClasses.card}>
            <CardContent className={`flex flex-col items-center justify-center text-center ${spacing.card.padding}`}>
              <div className="flex items-center justify-center bg-muted rounded-full size-24 mb-6">
                <Archive className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className={typography.h3}>¡Todo al día!</h3>
              <p className={`${typography.body.small} mt-2`}>
                {activeTab === "archived"
                  ? "No tienes notificaciones archivadas."
                  : "No tienes notificaciones nuevas."}
              </p>
            </CardContent>
          </Card>
        ) : (
          displayedNotifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card
                key={notification.id}
                className={`${commonClasses.card} transition-all hover:bg-muted/50 cursor-pointer w-full`}
              >
                <CardContent className={`flex items-center ${spacing.gap.medium} ${spacing.card.padding}`}>
                  {/* Icono */}
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full ${notification.iconBgColor} ${notification.iconColor} size-12`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p className={`${typography.body.large} font-semibold truncate`}>
                      {notification.title}
                    </p>
                    <p className={`${typography.body.base} text-muted-foreground truncate`}>
                      {notification.description}
                    </p>
                  </div>

                  {/* Timestamp y estado */}
                  <div className="flex flex-col items-end gap-2 text-right shrink-0">
                    <p className={`${typography.body.small} text-muted-foreground whitespace-nowrap`}>
                      {notification.timestamp}
                    </p>
                    {!notification.isRead && (
                      <Badge
                        className="size-2.5 rounded-full p-0 border-0 bg-primary"
                        style={{ backgroundColor: colors.primary }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      {activeTab === "notifications" && unreadCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleMarkAllAsRead}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            size="icon"
          >
            <CheckCheck className="h-6 w-6" />
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}
