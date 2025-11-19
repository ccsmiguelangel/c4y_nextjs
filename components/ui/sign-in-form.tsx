"use client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components_shadcn/ui/form";
import { Input } from "@/components_shadcn/ui/input";
import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components_shadcn/ui/card";
import { useForm } from "react-hook-form";
import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SinginFormData } from "@/lib/types";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => {
  return data.email.includes("@") && data.email.includes(".") && data.email.length > 5;
}, {
  path: ["email"],
  message: "El correo electrónico debe contener un @ y un .",
});

interface SignInFormProps {
  data: SinginFormData;
}

export function SignInForm({ data }: SignInFormProps) {
  if (!data) return null;

  const { 
    header,
    email_label,
    email_placeholder,
    password_label,
    password_placeholder,
    submit_button,
    singup_previous_link_text,
    singup_link,
  } = data;
  
  // singup_link es un array, tomar el primer elemento
  const singupLink = singup_link?.[0];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  }); 

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <>
      <Card className="w-full py-8 px-8 bg-white">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-3xl font-bold text-primary text-center">{header.title}</CardTitle>
          <CardDescription className="text-base text-center">
            {header.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField 
                control={form.control} 
                name="email" 
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-medium">{email_label}</FormLabel> 
                    <FormControl> 
                      <Input 
                        placeholder={email_placeholder} 
                        type="email" 
                        className="h-14 px-5 text-base rounded-xl border border-gray-200 bg-white"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name="password" 
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-medium">{password_label}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={password_placeholder} 
                        type="password" 
                        className="h-14 px-5 text-base rounded-xl border border-gray-200 bg-white"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <CardFooter className="flex justify-center pt-6 px-0">
                <Button 
                  type="submit" 
                  variant="default"
                  className="btn-black"
                  disabled={form.formState.isSubmitting}
                >
                  {submit_button}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    {singupLink && (
      <p className="text-base text-muted-foreground text-center pt-4">
        {singup_previous_link_text}{" "}
        <Link href={singupLink.href} className="text-primary hover:underline font-medium">
          {singupLink.label}
        </Link>
      </p>
    )}
  </>
  );
}