import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components_shadcn/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, "className"> {
  /**
   * Placeholder del input de búsqueda
   */
  placeholder?: string;
  /**
   * Clase adicional para el contenedor
   */
  containerClassName?: string;
  /**
   * Variante de fondo: 'muted' usa bg-muted, 'card' usa bg-card con border
   * @default 'muted'
   */
  variant?: "muted" | "card";
  /**
   * Altura del input
   * @default 'h-12'
   */
  height?: string;
}

/**
 * Componente de input de búsqueda sin bordes al activarse.
 * 
 * Este componente encapsula el estilo estándar para inputs de búsqueda
 * que se mantienen sin borde cuando están activos/focus.
 * 
 * @example
 * ```tsx
 * <SearchInput
 *   placeholder="Buscar..."
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 * />
 * ```
 */
export function SearchInput({
  placeholder = "Buscar...",
  containerClassName,
  variant = "muted",
  height = "h-12",
  ...inputProps
}: SearchInputProps) {
  const isCardVariant = variant === "card";
  
  const containerClasses = cn(
    "flex w-full items-stretch",
    height,
    isCardVariant 
      ? "rounded-xl bg-card border border-border shadow-sm"
      : "rounded-lg bg-muted",
    containerClassName
  );

  const inputClasses = cn(
    "flex w-full min-w-0 flex-1",
    "border-none",
    isCardVariant ? "bg-card" : "bg-muted",
    "focus-visible:ring-0",
    "focus-visible:ring-offset-0",
    "focus-visible:outline-none",
    "focus:ring-0",
    "focus:outline-none",
    height,
    isCardVariant ? "rounded-r-xl rounded-l-none" : "rounded-l-none",
    "border-l-0 pl-2 text-base",
    "placeholder:text-muted-foreground"
  );

  return (
    <label className="flex flex-col min-w-40 w-full">
      <div className={containerClasses}>
        <div className="text-muted-foreground flex items-center justify-center pl-4">
          <Search className="h-5 w-5" />
        </div>
        <Input
          className={inputClasses}
          placeholder={placeholder}
          {...inputProps}
        />
      </div>
    </label>
  );
}

