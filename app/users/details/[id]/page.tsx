"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components_shadcn/ui/avatar";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Mail, 
  Megaphone,
  MessageSquare,
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components_shadcn/ui/dropdown-menu";
import { spacing, typography } from "@/lib/design-system";
import { AdminLayout } from "@/components/admin/admin-layout";

interface CommunicationHistory {
  id: string;
  type: "call" | "email" | "campaign";
  title: string;
  date: string;
  author: string;
}

interface Vehicle {
  id: string;
  name: string;
  color: string;
  price: string;
  image: string;
}

interface ClientData {
  id: string;
  name: string;
  avatar?: string;
  status: "activo" | "lead" | "vip";
  leadSince: string;
  phone: string;
  email: string;
}

// Datos de ejemplo - en producción vendrían de una API usando el ID
const getClientData = (id: string): ClientData | null => {
  const clients: Record<string, ClientData> = {
    "1": {
      id: "1",
      name: "Alejandro Gomez",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeP0WOO_emI8zYv8K2OFVM-JWtkYiwQHKorZPb1Lu1zxouBvi_-3x_UEO8EAi4uiWk0YGMrRypONstn9oPJ_9EfEW7NTXnyvhwL1_A8YmbvkJHK_wZVHUOhE8boLjjwudUl1Z4vb1-O8faA-35tD0O6uU1HVfrwg7p5aNnrpuqBVLZl4gYgNyyEi6IxafWO5dCfZzTcEMEnx4F0XLEfi4QN_grFv3C_q-mgvXuFslPwisodZWNTzrfSxTl0MDlu-9Ks4SE07kUqpc",
      status: "activo",
      leadSince: "10/03/2024",
      phone: "+34 612 345 678",
      email: "alejandro.gomez@email.com",
    },
    "2": {
      id: "2",
      name: "Beatriz Fernández",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCEB-3XKUYmOr9W6KntDx6Vq1wxTNOhPVnX0GorIPVOVG0dfbLHo_fg5wGlPjGuOkf-xbaWFhgkvmzi-z2vn5PbjKZ0vtdQhk-NdM07FR8-6OzR0ph0UXiszKIzY7Xdyibm9xgLpoMibeB-qPOHaQIn4JN9JAnOGamzDYvxRrL2qXeF7m7P0rRtOj2iU6Fqx0NWNoVG2K5jvz-UEFBCykp_4Dkw7wMy8vg7udSCnlJOPclE2ObH7QTG9DVQioDLdLWIHwSKYuYef8A",
      status: "lead",
      leadSince: "15/05/2024",
      phone: "+34 612 345 678",
      email: "beatriz.f@email.com",
    },
    "3": {
      id: "3",
      name: "Carlos Santana",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBlV1Svfat0UTt97VHsCrRU-NUBkkf3-oLR1zimc7kwlhbjGDhRGlZuAlXOQmjwfYEOq8WVqWz-BZBS-DkTDn9ffVYkMcO5_OogUGeVinaT6d4OGgcmv2hE1bsNoHKYVmETomIZLKZiSyfHuZ64f9RzzW0J0qgEYs5ZZoYXqDWIugoNuYcO_plPuhj5-3P96dICAGZ4JUF_yoLCMAb-bzswLJF4Shoe-iPGMA3bw1xJXOzru4psoKb0IUjHDhxtyDPoh-wTfVpB12I",
      status: "vip",
      leadSince: "15/03/2023",
      phone: "+34 611 222 333",
      email: "carlos.santana@email.com",
    },
    "4": {
      id: "4",
      name: "Diana Moreno",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuByJJhs0cEabmMFVU9WyQP0OPHK5vTRnfKkZVPZ-fbItSt9VnXJg08c3zq3a-MkSIqUETpKHlxt0IlsG07VT9eRMtLVl-e9fKZfATNQ4N4hG0Bn692VVnBnyvn4M28WTK7haKGpKZ4ZMUQZMnHwYiKh5_ZMZ_Bsale5OLXkceGmK63m5e7hh3x8M-d9TBAYse_t5BmZTqHgSsVEFnbogibenyhGS6Etx7MZbJqY7kjZOjIVTjOT4KGbG7rl-uPFmC8lVsm9phaOFDE",
      status: "lead",
      leadSince: "22/05/2024",
      phone: "+34 698 765 432",
      email: "diana.moreno@email.com",
    },
  };
  return clients[id] || null;
};

const getVehicleData = (clientId: string): Vehicle | null => {
  const vehicles: Record<string, Vehicle> = {
    "1": {
      id: "1",
      name: "Sedán Premium Modelo A",
      color: "Negro Perla",
      price: "$38,500 USD",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuALtOtoBY3Ju52sfJzGdDceXS_LNoeFJr7vLYxrah94jT0WCdA4B3oE-Xvq6gkFwt5y3kbTUyJX1XB-V_WEAOb8VpWgVTmoGKQN8dObJi6JWXxQR2cOe7RM4pal_v7zrcrhzDuEYuhuftp7WIUpDakZtAtNHTcnE4S97WiVbt2ojFBXLp_KfUWaa9-pc0DZfKjVrQX2K8cGCgROIDM0mLV4fCC5PDQN2g5Rt3QnTKWcFC0c0ssu19GvHX35ynl-RhS7SmjCS95yWO0",
    },
    "2": {
      id: "2",
      name: "SUV Eléctrico Modelo X",
      color: "Azul Metálico",
      price: "$45,000 USD",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuALtOtoBY3Ju52sfJzGdDceXS_LNoeFJr7vLYxrah94jT0WCdA4B3oE-Xvq6gkFwt5y3kbTUyJX1XB-V_WEAOb8VpWgVTmoGKQN8dObJi6JWXxQR2cOe7RM4pal_v7zrcrhzDuEYuhuftp7WIUpDakZtAtNHTcnE4S97WiVbt2ojFBXLp_KfUWaa9-pc0DZfKjVrQX2K8cGCgROIDM0mLV4fCC5PDQN2g5Rt3QnTKWcFC0c0ssu19GvHX35ynl-RhS7SmjCS95yWO0",
    },
    "3": {
      id: "3",
      name: "Camioneta Deportiva Modelo Z",
      color: "Rojo Intenso",
      price: "$52,000 USD",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuALtOtoBY3Ju52sfJzGdDceXS_LNoeFJr7vLYxrah94jT0WCdA4B3oE-Xvq6gkFwt5y3kbTUyJX1XB-V_WEAOb8VpWgVTmoGKQN8dObJi6JWXxQR2cOe7RM4pal_v7zrcrhzDuEYuhuftp7WIUpDakZtAtNHTcnE4S97WiVbt2ojFBXLp_KfUWaa9-pc0DZfKjVrQX2K8cGCgROIDM0mLV4fCC5PDQN2g5Rt3QnTKWcFC0c0ssu19GvHX35ynl-RhS7SmjCS95yWO0",
    },
    "4": {
      id: "4",
      name: "Híbrido Compacto Modelo Y",
      color: "Blanco Nacarado",
      price: "$32,000 USD",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuALtOtoBY3Ju52sfJzGdDceXS_LNoeFJr7vLYxrah94jT0WCdA4B3oE-Xvq6gkFwt5y3kbTUyJX1XB-V_WEAOb8VpWgVTmoGKQN8dObJi6JWXxQR2cOe7RM4pal_v7zrcrhzDuEYuhuftp7WIUpDakZtAtNHTcnE4S97WiVbt2ojFBXLp_KfUWaa9-pc0DZfKjVrQX2K8cGCgROIDM0mLV4fCC5PDQN2g5Rt3QnTKWcFC0c0ssu19GvHX35ynl-RhS7SmjCS95yWO0",
    },
  };
  return vehicles[clientId] || null;
};

const getCommunicationHistory = (clientId: string): CommunicationHistory[] => {
  const histories: Record<string, CommunicationHistory[]> = {
    "1": [
      {
        id: "1",
        type: "call",
        title: "Llamada de seguimiento post-venta",
        date: "25/05/2024",
        author: "María (Vendedora)",
      },
      {
        id: "2",
        type: "email",
        title: "Envío de garantía extendida",
        date: "20/05/2024",
        author: "Automático",
      },
      {
        id: "3",
        type: "call",
        title: "Cliente activo desde",
        date: "10/03/2024",
        author: "Sistema",
      },
    ],
    "2": [
      {
        id: "1",
        type: "call",
        title: "Llamada inicial de seguimiento",
        date: "20/05/2024",
        author: "Carlos (Vendedor)",
      },
      {
        id: "2",
        type: "email",
        title: "Envío de catálogo y precios",
        date: "18/05/2024",
        author: "Automático",
      },
      {
        id: "3",
        type: "campaign",
        title: "Lead generado desde campaña online",
        date: "15/05/2024",
        author: "Sistema",
      },
    ],
    "3": [
      {
        id: "1",
        type: "call",
        title: "Llamada VIP - Oferta exclusiva",
        date: "28/05/2024",
        author: "Ana (Gerente)",
      },
      {
        id: "2",
        type: "email",
        title: "Invitación a evento VIP",
        date: "25/05/2024",
        author: "Marketing",
      },
      {
        id: "3",
        type: "call",
        title: "Cliente VIP desde",
        date: "15/03/2023",
        author: "Sistema",
      },
    ],
    "4": [
      {
        id: "1",
        type: "call",
        title: "Llamada de seguimiento inicial",
        date: "24/05/2024",
        author: "Pedro (Vendedor)",
      },
      {
        id: "2",
        type: "email",
        title: "Envío de información de vehículos",
        date: "23/05/2024",
        author: "Automático",
      },
      {
        id: "3",
        type: "campaign",
        title: "Lead generado desde redes sociales",
        date: "22/05/2024",
        author: "Sistema",
      },
    ],
  };
  return histories[clientId] || [];
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getCommunicationIcon = (type: CommunicationHistory["type"]) => {
  switch (type) {
    case "call":
      return Phone;
    case "email":
      return Mail;
    case "campaign":
      return Megaphone;
  }
};

const getCommunicationIconColor = (type: CommunicationHistory["type"]) => {
  switch (type) {
    case "call":
      return "bg-green-100 text-green-600";
    case "email":
      return "bg-blue-100 text-blue-600";
    case "campaign":
      return "bg-yellow-100 text-yellow-600";
  }
};

const getStatusBadgeClass = (status: ClientData["status"]) => {
  switch (status) {
    case "activo":
      return "bg-green-100 text-green-800";
    case "lead":
      return "bg-orange-100 text-orange-800";
    case "vip":
      return "bg-blue-100 text-blue-800";
  }
};

const getStatusLabel = (status: ClientData["status"]) => {
  switch (status) {
    case "activo":
      return "Activo";
    case "lead":
      return "Lead";
    case "vip":
      return "VIP";
  }
};

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [note, setNote] = useState("");

  const clientData = getClientData(userId);
  const vehicleData = clientData ? getVehicleData(userId) : null;
  const communicationHistory = clientData ? getCommunicationHistory(userId) : [];

  if (!clientData) {
    return (
      <AdminLayout title="Cliente no encontrado">
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px]`}>
          <p className={typography.body.large}>El cliente solicitado no existe.</p>
          <Button onClick={() => router.push("/users")}>
            Volver a Clientes
          </Button>
        </section>
      </AdminLayout>
    );
  }

  const handleSaveNote = () => {
    // Aquí iría la lógica para guardar la nota
    console.log("Nota guardada:", note, "para cliente:", userId);
    setNote("");
  };

  return (
    <AdminLayout title={clientData.name}>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Información del Cliente */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardContent className={`flex flex-col items-center ${spacing.gap.base} p-6 relative`}>
            {/* Botones de navegación en la parte superior */}
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
                  <DropdownMenuItem className="cursor-pointer">Editar Cliente</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" className="cursor-pointer">Eliminar Cliente</DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Exportar Datos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Avatar */}
            <Avatar className="h-24 w-24 shrink-0 rounded-full mt-8">
              {clientData.avatar ? (
                <AvatarImage 
                  src={clientData.avatar} 
                  alt={`Avatar de ${clientData.name}`}
                  className="rounded-full"
                />
              ) : null}
              <AvatarFallback className="rounded-full text-xl">
                {getInitials(clientData.name)}
              </AvatarFallback>
            </Avatar>

            {/* Nombre */}
            <div className="flex flex-col items-center text-center">
              <h2 className={`${typography.h3} text-center`}>
                {clientData.name}
              </h2>
              <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                {clientData.email}
              </p>
            </div>

            {/* Badge */}
            <Badge className={`rounded-full px-3 py-1 text-xs font-medium border-0 ${getStatusBadgeClass(clientData.status)}`}>
              {getStatusLabel(clientData.status)}
            </Badge>

            {/* Botones de acción */}
            <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                onClick={() => window.location.href = `tel:${clientData.phone}`}
              >
                <Phone className="h-5 w-5 flex-shrink-0" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                onClick={() => window.location.href = `mailto:${clientData.email}`}
              >
                <Mail className="h-5 w-5 flex-shrink-0" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                onClick={() => {
                  // Acción de mensaje
                }}
              >
                <MessageSquare className="h-5 w-5 flex-shrink-0" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                onClick={() => {
                  // Acción de editar
                }}
              >
                <Edit className="h-5 w-5 flex-shrink-0" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vehículo de Interés */}
        {vehicleData && (
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className={typography.h4}>Vehículo de Interés</CardTitle>
            </CardHeader>
            <CardContent className={`flex items-start ${spacing.gap.medium} px-6 pb-6`}>
              <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={vehicleData.image}
                  alt={vehicleData.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                  priority={false}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h3 className={`${typography.body.large} font-semibold line-clamp-2`}>
                  {vehicleData.name}
                </h3>
                <p className={`${typography.body.small}`}>
                  Color: <span className="text-foreground font-medium">{vehicleData.color}</span>
                </p>
                <p className={`${typography.body.base} text-foreground font-semibold mt-1`}>
                  Precio estimado: {vehicleData.price}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de Comunicación */}
        {communicationHistory.length > 0 && (
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className={typography.h4}>Historial de Comunicación</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <ul className={`flex flex-col ${spacing.gap.base}`}>
                {communicationHistory.map((item) => {
                  const Icon = getCommunicationIcon(item.type);
                  const iconColorClass = getCommunicationIconColor(item.type);
                  
                  return (
                    <li key={item.id} className={`flex items-start ${spacing.gap.base}`}>
                      <div className={`flex size-8 items-center justify-center rounded-full shrink-0 ${iconColorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`${typography.body.base} font-medium`}>
                          {item.title}
                        </p>
                        <p className={`${typography.body.small} text-xs mt-0.5`}>
                          {item.date} - {item.author}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Notas y Comentarios */}
        <Card className="shadow-sm ring-1 ring-inset ring-border/50">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className={typography.h4}>Notas y Comentarios</CardTitle>
          </CardHeader>
          <CardContent className={`flex flex-col ${spacing.gap.base} px-6 pb-6`}>
            <Textarea
              placeholder="Añadir una nota sobre el cliente..."
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

