"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components_shadcn/ui/button";
import { Input } from "@/components_shadcn/ui/input";
import { ScrollArea } from "@/components_shadcn/ui/scroll-area";
import { adminNavSections } from "./mobile-menu";

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMetaK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (isMetaK) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (!open) {
      setQuery("");
      return;
    }

    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [open, mounted]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return adminNavSections;
    }

    return adminNavSections
      .map((section) => ({
        label: section.label,
        items: section.items.filter((item) =>
          item.label.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [query]);

  const spotlightPortal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-32">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-label="Cerrar buscador"
              onClick={() => setOpen(false)}
            />
            <div
              className="relative z-[121] w-full max-w-3xl rounded-2xl border bg-background shadow-2xl ring-1 ring-border/50 overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-2 flex flex-col">
                <div className="relative shrink-0">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar secciones, módulos o páginas..."
                    className="h-14 pl-12 pr-4 text-base"
                  />
                </div>
                {filteredSections.length > 0 && (
                  <div className="mt-2 border-t flex-1 min-h-0">
                    <ScrollArea className="h-[400px]">
                      <div className="py-2 pr-4">
                        {filteredSections.map((section) => (
                          <div key={section.label} className="py-1">
                            {section.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setOpen(false)}
                                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-base transition-colors hover:bg-muted"
                                >
                                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                                  <span className="flex-1 truncate">{item.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                {query.trim() && filteredSections.length === 0 && (
                  <div className="mt-2 border-t py-8 text-center shrink-0">
                    <p className="text-sm text-muted-foreground">No se encontraron resultados.</p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="flex h-10 w-10 items-center justify-center rounded-full"
        aria-label="Abrir búsqueda global (⌘K)"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
        <span className="sr-only">Abrir búsqueda global</span>
      </Button>
      {spotlightPortal}
    </>
  );
}

