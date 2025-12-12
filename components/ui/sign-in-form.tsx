"use client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components_shadcn/ui/form";
import { Input } from "@/components_shadcn/ui/input";
import { Button } from "@/components_shadcn/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components_shadcn/ui/card";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useActionState, startTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SinginFormData } from "@/validations/types";
import { actions } from "@/actions";
import { type FormState, SignInFormSchema } from "@/validations/auth";
import { FormError } from "./form-error";
import { Loader2 } from "lucide-react";
interface SignInFormProps {
  data: SinginFormData;
}

export function SignInForm({ data }: SignInFormProps) {
  if (!data) return null;

  const INITIAL_STATE: FormState = {
    data: {
      identifier: "",
      password: "",
    },
    zodErrors: null,
    strapiErrors: undefined,
    success: false,
    isLoading: false,
    message: undefined,
  };

  const [formState, formAction] = useActionState(
    actions.auth.loginUserAction,
    INITIAL_STATE
  );

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

  const form = useForm<z.infer<typeof SignInFormSchema>>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  }); 

  function onSubmit(values: z.infer<typeof SignInFormSchema>) {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    
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
                    <FormError error={formState.zodErrors?.email} />
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
                    <FormError error={formState.zodErrors?.password} />
                  </FormItem>
                )} 
              />
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
                    submit_button
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
