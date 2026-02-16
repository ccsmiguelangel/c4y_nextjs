"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Button } from "@/components_shadcn/ui/button";
import { Badge } from "@/components_shadcn/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components_shadcn/ui/avatar";
import { Textarea } from "@/components_shadcn/ui/textarea";
import { Input } from "@/components_shadcn/ui/input";
import { Label } from "@/components_shadcn/ui/label";
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Mail, 
  MessageSquare,
  Edit,
  Save,
  X,
  Calendar,
  Car,
  Shield,
  Briefcase,
  User as UserIcon,
  Bell,
  Camera,
  Upload,
  MapPin,
  Clock,
  FileText,
  Linkedin,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2
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
import { strapiImages } from "@/lib/strapi-images";
import { Skeleton } from "@/components_shadcn/ui/skeleton";
import { toast } from "@/lib/toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FleetReminders } from "@/components/ui/fleet-reminders";
import type { FleetReminder } from "@/validations/types";
import { emitReminderToggleCompleted } from "@/lib/reminder-events";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components_shadcn/ui/alert-dialog";

interface UserProfile {
  id: number;
  documentId?: string;
  displayName: string;
  email?: string;
  phone?: string;
  role: "admin" | "seller" | "driver";
  department?: string;
  bio?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  identificationNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  linkedin?: string;
  workSchedule?: string;
  specialties?: string;
  driverLicense?: string;
  avatar?: {
    url?: string;
    alternativeText?: string;
  };
  assignedVehicles?: Array<{
    id: number;
    documentId?: string;
    name: string;
    vin: string;
    brand: string;
    model: string;
    year: number;
    image?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  interestedVehicles?: Array<{
    id: number;
    documentId?: string;
    name: string;
    vin: string;
    brand: string;
    model: string;
    year: number;
    image?: {
      url?: string;
      alternativeText?: string;
    };
  }>;
  assignedReminders?: FleetReminder[];
}

const roleConfig = {
  admin: { 
    label: "Administrador", 
    className: "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100",
    icon: Shield 
  },
  seller: { 
    label: "Vendedor", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
    icon: Briefcase 
  },
  driver: { 
    label: "Conductor", 
    className: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
    icon: Car 
  },
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    role: "driver" as "admin" | "seller" | "driver",
    department: "",
    bio: "",
    address: "",
    dateOfBirth: "",
    hireDate: "",
    identificationNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    linkedin: "",
    workSchedule: "",
    specialties: "",
    driverLicense: "",
  });

  const updateImagePreview = useCallback((value: string | null, isObjectUrl = false) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    if (isObjectUrl && value) {
      previewObjectUrlRef.current = value;
    }

    setImagePreview(value);
  }, []);

  useEffect(() => {
    if (userId && userId !== "new") {
      loadUser();
    } else if (userId === "new") {
      setIsLoading(false);
    }
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/user-profiles/${userId}`, { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 404) {
          setError("Usuario no encontrado");
          setIsLoading(false);
          return;
        }
        // Intentar obtener más información del error
        let errorMessage = "Error al cargar usuario";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no es JSON, intentar leer como texto
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // Si falla todo, usar el mensaje por defecto
          }
        }
        console.error("Error cargando usuario:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }
      const responseData = await response.json();
      
      // Verificar que la respuesta tenga la estructura esperada
      if (!responseData || !responseData.data) {
        throw new Error("La respuesta del servidor no tiene el formato esperado");
      }
      
      const { data } = responseData;
      setUser(data);
      setFormData({
        displayName: data.displayName || "",
        email: data.email || "",
        phone: data.phone || "",
        role: data.role || "driver",
        department: data.department || "",
        bio: data.bio || "",
        address: data.address || "",
        dateOfBirth: data.dateOfBirth ? format(new Date(data.dateOfBirth), "yyyy-MM-dd") : "",
        hireDate: data.hireDate ? format(new Date(data.hireDate), "yyyy-MM-dd") : "",
        identificationNumber: data.identificationNumber || "",
        emergencyContactName: data.emergencyContactName || "",
        emergencyContactPhone: data.emergencyContactPhone || "",
        linkedin: data.linkedin || "",
        workSchedule: data.workSchedule || "",
        specialties: data.specialties || "",
        driverLicense: data.driverLicense || "",
      });
      // Cargar preview de imagen si existe
      if (data.avatar?.url) {
        updateImagePreview(strapiImages.getURL(data.avatar.url));
      } else {
        updateImagePreview(null);
      }
      setSelectedImageFile(null);
      setShouldRemoveImage(false);
    } catch (err) {
      console.error("Error cargando usuario:", err);
      const errorMessage = err instanceof Error ? err.message : "No se pudo cargar el usuario";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validar tipo de archivo
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast.error(`Tipo de archivo no válido. Solo se permiten imágenes: ${validImageTypes.join(', ')}`);
      return;
    }

    // Validar tamaño (máximo 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error("El archivo es demasiado grande. El tamaño máximo es 10MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    updateImagePreview(objectUrl, true);
    setSelectedImageFile(file);
    setShouldRemoveImage(false);

    // Si no está en modo edición, guardar automáticamente la imagen
    if (!isEditing && user) {
      await handleSaveImageOnly(file);
    }
  };

  const handleSaveImageOnly = async (file: File) => {
    if (!user) return;
    setIsUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("files", file);

      const uploadResponse = await fetch("/api/strapi/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Error al subir la imagen");
      }

      const uploadData = await uploadResponse.json();
      const uploadedImageId = uploadData.data?.id || null;

      if (uploadedImageId) {
        const response = await fetch(`/api/user-profiles/${user.documentId || user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { avatar: uploadedImageId } }),
        });
        if (!response.ok) {
          throw new Error("Error al guardar");
        }
        await loadUser();
        toast.success("Imagen de perfil actualizada correctamente");
      }
    } catch (err) {
      console.error("Error guardando imagen:", err);
      const errorMessage = err instanceof Error ? err.message : "Error al guardar la imagen";
      toast.error("Error al guardar imagen", {
        description: errorMessage,
      });
      // Restaurar imagen original en caso de error
      if (user.avatar?.url) {
        updateImagePreview(strapiImages.getURL(user.avatar.url));
      } else {
        updateImagePreview(null);
      }
      setSelectedImageFile(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    updateImagePreview(null);
    setSelectedImageFile(null);
    setShouldRemoveImage(true);
  };

  const handleRestoreOriginalImage = () => {
    if (!user?.avatar?.url) return;
    updateImagePreview(strapiImages.getURL(user.avatar.url));
    setSelectedImageFile(null);
    setShouldRemoveImage(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let uploadedImageId: number | null = null;

      // Subir imagen si hay una nueva
      if (selectedImageFile) {
        setIsUploadingImage(true);
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("files", selectedImageFile);

          const uploadResponse = await fetch("/api/strapi/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || "Error al subir la imagen");
          }

          const uploadData = await uploadResponse.json();
          uploadedImageId = uploadData.data?.id || null;
        } catch (uploadError) {
          console.error("Error subiendo imagen:", uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Error al subir la imagen";
          toast.error("Error al subir imagen", {
            description: errorMessage,
          });
          setIsUploadingImage(false);
          setIsSaving(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Preparar datos para actualizar
      const updateData: any = { ...formData };
      
      if (uploadedImageId !== null) {
        updateData.avatar = uploadedImageId;
      } else if (shouldRemoveImage) {
        updateData.avatar = null;
      }

      const response = await fetch(`/api/user-profiles/${user.documentId || user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updateData }),
      });
      if (!response.ok) {
        throw new Error("Error al guardar");
      }
      await loadUser();
      setIsEditing(false);
      toast.success("Usuario actualizado correctamente");
    } catch (err) {
      console.error("Error guardando usuario:", err);
      toast.error("Error al guardar usuario");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/user-profiles/${user.documentId || user.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Error al eliminar");
      }
      toast.success("Usuario eliminado correctamente");
      router.push("/users");
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      toast.error("Error al eliminar usuario");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

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

  if (isLoading) {
    return (
      <AdminLayout title="Cargando usuario..." showFilterAction leftActions={backButton}>
        <section className={`flex flex-col ${spacing.gap.large}`}>
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardContent className={`flex flex-col items-center ${spacing.gap.base} p-6`}>
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        </section>
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout title="Usuario no encontrado" showFilterAction leftActions={backButton}>
        <section className={`flex flex-col items-center justify-center ${spacing.gap.base} min-h-[400px]`}>
          <p className={typography.body.large}>{error || "El usuario solicitado no existe."}</p>
          <Button onClick={() => router.push("/users")}>
            Volver a Usuarios
          </Button>
        </section>
      </AdminLayout>
    );
  }

  const roleInfo = roleConfig[user.role];
  const RoleIcon = roleInfo.icon;

  return (
    <AdminLayout title={user.displayName} showFilterAction leftActions={backButton}>
      <section className={`flex flex-col ${spacing.gap.large}`}>
        {/* Información del Usuario */}
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
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? "Cancelar edición" : "Editar Usuario"}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    variant="destructive" 
                    className="cursor-pointer"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Eliminar Usuario
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Avatar - Aseguramos que se muestre completo */}
            <div className="relative group">
              <Avatar className="h-24 w-24 shrink-0 rounded-full overflow-hidden ring-2 ring-background">
                {imagePreview ? (
                  <AvatarImage 
                    src={imagePreview} 
                    alt={user.avatar?.alternativeText || `Avatar de ${user.displayName}`}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : user.avatar?.url ? (
                  <AvatarImage 
                    src={strapiImages.getURL(user.avatar.url)} 
                    alt={user.avatar.alternativeText || `Avatar de ${user.displayName}`}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : null}
                <AvatarFallback className="rounded-full text-xl w-full h-full flex items-center justify-center bg-muted">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              {/* Overlay y botón para cambiar imagen - visible al hacer hover */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full bg-background/80 text-foreground hover:bg-background"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  title="Cambiar imagen de perfil"
                >
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
              {/* Botones de acción cuando hay cambios en la imagen y está en modo edición */}
              {isEditing && (selectedImageFile || shouldRemoveImage) && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-background rounded-full p-1 shadow-lg border border-border">
                  {selectedImageFile && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7 rounded-full"
                      onClick={handleRemoveImage}
                      disabled={isUploadingImage}
                      title="Eliminar imagen"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {shouldRemoveImage && user.avatar?.url && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full"
                      onClick={handleRestoreOriginalImage}
                      disabled={isUploadingImage}
                      title="Restaurar imagen original"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              {/* Indicador de carga al subir imagen */}
              {isUploadingImage && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* Input file oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageInputChange}
                className="hidden"
              />
            </div>

            {/* Nombre */}
            {isEditing ? (
              <div className="flex flex-col items-center w-full max-w-2xl gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div className="w-full">
                    <Label>Nombre</Label>
                    <Input
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Teléfono</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <Label>DNI/NIE</Label>
                    <Input
                      value={formData.identificationNumber}
                      onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                      className="mt-1"
                      placeholder="12345678X"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Rol</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "admin" | "seller" | "driver") => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="seller">Vendedor</SelectItem>
                        <SelectItem value="driver">Conductor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <Label>Departamento</Label>
                    <Input
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Fecha de Nacimiento</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Fecha de Contratación</Label>
                    <Input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Horario de Trabajo</Label>
                    <Input
                      value={formData.workSchedule}
                      onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
                      className="mt-1"
                      placeholder="Lunes a Viernes 9:00 - 18:00"
                    />
                  </div>
                  {user.role === "driver" && (
                    <div className="w-full">
                      <Label>Licencia de Conducir</Label>
                      <Input
                        value={formData.driverLicense}
                        onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                        className="mt-1"
                        placeholder="B, C, D"
                      />
                    </div>
                  )}
                  {user.role === "seller" && (
                    <div className="w-full">
                      <Label>Especialidades</Label>
                      <Input
                        value={formData.specialties}
                        onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                        className="mt-1"
                        placeholder="Especialidades o áreas de experiencia"
                      />
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <Label>Dirección</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1"
                    rows={2}
                    placeholder="Dirección completa"
                  />
                </div>
                <div className="w-full">
                  <Label>Biografía</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="mt-1"
                    rows={4}
                    placeholder="Escribe una breve biografía..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div className="w-full">
                    <Label>Contacto de Emergencia - Nombre</Label>
                    <Input
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="mt-1"
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Contacto de Emergencia - Teléfono</Label>
                    <Input
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="mt-1"
                      placeholder="+34 600 123 456"
                    />
                  </div>
                  <div className="w-full">
                    <Label>LinkedIn</Label>
                    <Input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      className="mt-1"
                      placeholder="https://linkedin.com/in/tu-perfil"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button onClick={handleSave} disabled={isSaving || isUploadingImage} size="lg" className="flex-1 min-h-[44px]">
                    {isSaving || isUploadingImage ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditing(false);
                      // Restaurar imagen original si se canceló
                      if (user.avatar?.url) {
                        updateImagePreview(strapiImages.getURL(user.avatar.url));
                      } else {
                        updateImagePreview(null);
                      }
                      setSelectedImageFile(null);
                      setShouldRemoveImage(false);
                    }} 
                    variant="outline" 
                    size="lg"
                    className="flex-1 min-h-[44px]"
                    disabled={isSaving || isUploadingImage}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center text-center">
                  <h2 className={`${typography.h3} text-center`}>
                    {user.displayName}
                  </h2>
                  {user.email && (
                    <p className={`${typography.body.small} mt-1 text-muted-foreground`}>
                      {user.email}
                    </p>
                  )}
                </div>

                {/* Badge de Rol */}
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium border-0 flex items-center gap-1 ${roleInfo.className}`}>
                  <RoleIcon className="h-3 w-3" />
                  {roleInfo.label}
                </Badge>

                {/* Información adicional */}
                {(user.phone || user.department) && (
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {user.phone}
                      </div>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {user.department}
                      </div>
                    )}
                  </div>
                )}

                {/* Botones de acción */}
                <div className={`flex items-center justify-center ${spacing.gap.small} w-full pt-2`}>
                  {user.phone && (
                    <Button
                      variant="default"
                      size="icon"
                      className="h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                      onClick={() => window.location.href = `tel:${user.phone}`}
                    >
                      <Phone className="h-5 w-5 flex-shrink-0" />
                    </Button>
                  )}
                  {user.email && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                      onClick={() => window.location.href = `mailto:${user.email}`}
                    >
                      <Mail className="h-5 w-5 flex-shrink-0" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-5 w-5 flex-shrink-0" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recordatorios */}
        {user.assignedReminders && user.assignedReminders.length > 0 && (
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className={`${typography.h4} flex items-center gap-2`}>
                <Bell className="h-5 w-5" />
                Recordatorios
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <FleetReminders
                reminders={user.assignedReminders}
                isLoading={false}
                onToggleCompleted={async (reminderId, isCompleted) => {
                  try {
                    const response = await fetch(`/api/fleet-reminders/${encodeURIComponent(reminderId)}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        data: { isCompleted: !isCompleted },
                      }),
                    });
                    if (!response.ok) throw new Error("Error al actualizar");
                    // Emitir evento de cambio de estado completado
                    emitReminderToggleCompleted(reminderId, !isCompleted);
                    toast.success(isCompleted ? "Recordatorio marcado como pendiente" : "Recordatorio marcado como completado");
                    await loadUser();
                  } catch (error) {
                    console.error("Error:", error);
                    toast.error("Error al actualizar el recordatorio");
                  }
                }}
                vehicleId={userId}
              />
            </CardContent>
          </Card>
        )}

        {/* Autos a los que están interesados */}
        {user.interestedVehicles && user.interestedVehicles.length > 0 && (
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className={`${typography.h4} flex items-center gap-2`}>
                <Car className="h-5 w-5" />
                Autos a los que están interesados
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                {user.interestedVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => router.push(`/fleet/details/${vehicle.documentId || vehicle.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  >
                    {vehicle.image?.url ? (
                      <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={strapiImages.getURL(vehicle.image.url)}
                          alt={vehicle.image.alternativeText || vehicle.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                        <Car className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`${typography.body.base} font-medium line-clamp-1`}>
                        {vehicle.name}
                      </p>
                      <p className={`${typography.body.small} text-muted-foreground`}>
                        {vehicle.brand} {vehicle.model} ({vehicle.year})
                      </p>
                      <p className={`${typography.body.small} text-xs text-muted-foreground mt-1`}>
                        VIN: {vehicle.vin}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Autos a los que están contratando */}
        {user.assignedVehicles && user.assignedVehicles.length > 0 && (
          <Card className="shadow-sm ring-1 ring-inset ring-border/50">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className={`${typography.h4} flex items-center gap-2`}>
                <Car className="h-5 w-5" />
                Autos a los que están contratando
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                {user.assignedVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => router.push(`/fleet/details/${vehicle.documentId || vehicle.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  >
                    {vehicle.image?.url ? (
                      <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={strapiImages.getURL(vehicle.image.url)}
                          alt={vehicle.image.alternativeText || vehicle.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                        <Car className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`${typography.body.base} font-medium line-clamp-1`}>
                        {vehicle.name}
                      </p>
                      <p className={`${typography.body.small} text-muted-foreground`}>
                        {vehicle.brand} {vehicle.model} ({vehicle.year})
                      </p>
                      <p className={`${typography.body.small} text-xs text-muted-foreground mt-1`}>
                        VIN: {vehicle.vin}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información Adicional */}
        {!isEditing && (
          <>
            {/* Información Personal Detallada */}
            {(user.address || user.dateOfBirth || user.identificationNumber || user.hireDate || user.workSchedule) && (
              <Card className="shadow-sm ring-1 ring-inset ring-border/50">
                <CardHeader className="px-6 pt-6 pb-4">
                  <CardTitle className={`${typography.h4} flex items-center gap-2`}>
                    <UserIcon className="h-5 w-5" />
                    Información Personal
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {user.identificationNumber && (
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className={`${typography.body.small} text-muted-foreground`}>DNI/NIE</p>
                          <p className={typography.body.base}>{user.identificationNumber}</p>
                        </div>
                      </div>
                    )}
                    {user.dateOfBirth && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className={`${typography.body.small} text-muted-foreground`}>Fecha de Nacimiento</p>
                          <p className={typography.body.base}>
                            {format(new Date(user.dateOfBirth), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                    )}
                    {user.hireDate && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className={`${typography.body.small} text-muted-foreground`}>Fecha de Contratación</p>
                          <p className={typography.body.base}>
                            {format(new Date(user.hireDate), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                    )}
                    {user.workSchedule && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className={`${typography.body.small} text-muted-foreground`}>Horario de Trabajo</p>
                          <p className={typography.body.base}>{user.workSchedule}</p>
                        </div>
                      </div>
                    )}
                    {user.address && (
                      <div className="flex items-start gap-3 md:col-span-2">
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className={`${typography.body.small} text-muted-foreground`}>Dirección</p>
                          <p className={typography.body.base}>{user.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información Profesional Adicional */}
            {((user.role === "driver" && user.driverLicense) || (user.role === "seller" && user.specialties)) && (
              <Card className="shadow-sm ring-1 ring-inset ring-border/50">
                <CardHeader className="px-6 pt-6 pb-4">
                  <CardTitle className={`${typography.h4} flex items-center gap-2`}>
                    <Briefcase className="h-5 w-5" />
                    Información Profesional
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="flex flex-col gap-4">
                    {user.role === "driver" && user.driverLicense && (
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className={`${typography.body.small} text-muted-foreground`}>Licencia de Conducir</p>
                          <p className={typography.body.base}>{user.driverLicense}</p>
                        </div>
                      </div>
                    )}
                    {user.role === "seller" && user.specialties && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className={`${typography.body.small} text-muted-foreground`}>Especialidades</p>
                          <p className={typography.body.base}>{user.specialties}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacto de Emergencia y Redes */}
            {(user.emergencyContactName || user.emergencyContactPhone || user.linkedin) && (
              <Card className="shadow-sm ring-1 ring-inset ring-border/50">
                <CardHeader className="px-6 pt-6 pb-4">
                  <CardTitle className={`${typography.h4} flex items-center gap-2`}>
                    <AlertCircle className="h-5 w-5" />
                    Contacto de Emergencia y Redes
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {user.emergencyContactName && (
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className={`${typography.body.small} text-muted-foreground`}>Contacto de Emergencia</p>
                          <p className={typography.body.base}>{user.emergencyContactName}</p>
                        </div>
                      </div>
                    )}
                    {user.emergencyContactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className={`${typography.body.small} text-muted-foreground`}>Teléfono de Emergencia</p>
                          <p className={typography.body.base}>{user.emergencyContactPhone}</p>
                        </div>
                      </div>
                    )}
                    {user.linkedin && (
                      <div className="flex items-center gap-3 md:col-span-2">
                        <Linkedin className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`${typography.body.small} text-muted-foreground`}>LinkedIn</p>
                          <a 
                            href={user.linkedin} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`${typography.body.base} text-primary hover:underline break-all`}
                          >
                            {user.linkedin}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Biografía */}
            {user.bio && (
              <Card className="shadow-sm ring-1 ring-inset ring-border/50">
                <CardHeader className="px-6 pt-6 pb-4">
                  <CardTitle className={typography.h4}>Biografía</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <p className={typography.body.base}>{user.bio}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario {user.displayName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
