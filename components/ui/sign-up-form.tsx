"use client";
import { Input } from "@/components_shadcn/ui/input";
import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components_shadcn/ui/card";
import { Form } from "@/components_shadcn/ui/form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components_shadcn/ui/form";
import Link from "next/link";
import { useActionState, startTransition } from "react";
import type { SingupFormData } from "@/validations/types";
import { actions } from "@/actions";
import { type FormState, SignUpFormSchema } from "@/validations/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormError } from "./form-error";
import { Loader2 } from "lucide-react";

export function SignUpForm({ data }: { readonly data: Readonly<SingupFormData> }) {
  if (!data) return null;


  const INITIAL_STATE: FormState = {
    data: {
      username: "",
      email: "",
      password: "",
    },
    zodErrors: null,
    strapiErrors: undefined,
    success: false,
    isLoading: false,
    message: undefined,
  };

  const [formState, formAction] = useActionState(
    actions.auth.registerUserAction,
    INITIAL_STATE
  );

  const { 
    header,
    username_label,
    username_placeholder,
    email_label,
    email_placeholder,
    password_label,
    password_placeholder,
    submit_buton,
    singin_previous_link_text,
    singin_link,
  } = data;
  
  // singin_link es un array, tomar el primer elemento
  const singinLink = singin_link?.[0];

  const form = useForm<z.infer<typeof SignUpFormSchema>>({
    defaultValues: INITIAL_STATE.data,
  });

  function onSubmit(values: z.infer<typeof SignUpFormSchema>) {
    // Convertir los valores a FormData para la Server Action
    const formData = new FormData();
    formData.append("username", values.username);
    formData.append("email", values.email);
    formData.append("password", values.password);
    
    // Llamar a la Server Action dentro de startTransition
    startTransition(() => {
      formAction(formData);
    });
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
            <div className="space-y-6">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium">
                    {username_label}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={username_placeholder}
                      className="h-14 px-5 text-base rounded-xl border border-gray-200 bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormError error={formState.zodErrors?.username} />
                </FormItem>
              )} /> 
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium">
                    {email_label}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={email_placeholder}
                      className="h-14 px-5 text-base rounded-xl border border-gray-200 bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormError error={formState.zodErrors?.email} />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium">
                    {password_label}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={password_placeholder}
                      className="h-14 px-5 text-base rounded-xl border border-gray-200 bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormError error={formState.zodErrors?.password} />
                </FormItem>
              )} />
              <CardFooter className="flex flex-col items-center pt-6 px-0 space-y-2">
                <Button
                  type="button"
                  variant="default"
                  className="btn-black"
                  disabled={form.formState.isSubmitting || formState.success}
                  onClick={form.handleSubmit(onSubmit)}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    submit_buton
                  )}
                </Button>

                {formState.strapiErrors && (
                  <FormMessage className="text-pink-500 text-sm text-center">
                    {formState.strapiErrors.message}
                  </FormMessage>
                )}
              </CardFooter>
            </div>
          </Form>
        </CardContent>
      </Card>
      {singinLink && (
        <p className="text-base text-muted-foreground text-center pt-4">
          {singin_previous_link_text}{" "}
          <Link href={singinLink.href} className="text-primary hover:underline font-medium">
            {singinLink.label}
          </Link>
        </p>
      )}
    </>
  );
}

