"use server"
import { z } from "zod"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { STRAPI_BASE_URL_HOSTNAME } from "@/lib/config"
import { STRAPI_BASE_URL_PORT, STRAPI_BASE_URL_PROTOCOL } from "@/lib/config"

import { SignUpFormSchema, SignInFormSchema, type FormState } from "@/validations/auth"
import { registerUserService, loginUserService } from "@/lib/strapi"

const cookieConfig = {
  maxAge: 60 * 60 * 24 * 7, // 1 week,
  path: '/',
  httpOnly: true, // only accessible by the server
  domain: STRAPI_BASE_URL_HOSTNAME,
  secure: process.env.NODE_ENV === 'production',
}

export async function registerUserAction(prevState: FormState, formData: FormData): Promise<FormState> {

  const fields = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
    email: formData.get('email') as string,
  }

  const validatedFields = SignUpFormSchema.safeParse(fields)

  if (!validatedFields.success) {
    const flattenedErrors = z.flattenError(validatedFields.error)

    console.log("Validation errors:", flattenedErrors.fieldErrors)

    return {
      success: false,
      message: "Validation error",
      strapiErrors: undefined,
      zodErrors: flattenedErrors.fieldErrors,
      data: fields
    }
  }

  const response = await registerUserService(validatedFields.data)

  if (!response || response.error) {
    return {
      success: false,
      message: "Registration error",
      strapiErrors: response?.error,
      zodErrors: null,
      data: fields
    }
  }

  const cookieStore = await cookies()
  cookieStore.set('jwt', response.jwt, cookieConfig)
  redirect('/dashboard')
}

export async function loginUserAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = {
    identifier: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validatedFields = SignInFormSchema.safeParse({
    email: fields.identifier,
    password: fields.password,
  })

  if (!validatedFields.success) {
    const flattenedErrors = z.flattenError(validatedFields.error)

    return {
      success: false,
      message: "Validation error",
      strapiErrors: undefined,
      zodErrors: flattenedErrors.fieldErrors,
      data: fields
    }
  }

  const response = await loginUserService(fields)

  if (!response || response.error) {
    return {
      success: false,
      message: "Login error",
      strapiErrors: response?.error,
      zodErrors: null,
      data: fields
    }
  }

  const cookieStore = await cookies()
  cookieStore.set('jwt', response.jwt, cookieConfig)
  redirect('/dashboard')
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('jwt')
  redirect('/signin')
}