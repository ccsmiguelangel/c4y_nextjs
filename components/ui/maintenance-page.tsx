"use client";

import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components_shadcn/ui/card";
import { Wrench, ArrowRight } from "lucide-react";
import Link from "next/link";

export function MaintenancePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md py-8 px-8 bg-white">
        <CardHeader className="space-y-4 pb-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Wrench className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Under Maintenance
          </CardTitle>
          <CardDescription className="text-base">
            We're working on something amazing. The website will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Button
              asChild
              variant="default"
              className="btn-black flex items-center gap-2"
            >
              <Link href="/signin">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Thank you for your patience!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

