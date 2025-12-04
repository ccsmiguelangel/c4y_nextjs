import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STRAPI_BASE_URL } from "./lib/config";

// Rutas base que no siguen el patrón de módulos
const baseRoutes = [
  "/dashboard",
  "/dashboard_user",
  "/notifications",
];

// Módulos que siguen el patrón estándar
const modules = [
  "billing",
  "fleet",
  "users",
  "adm-services",
  "calendar",
  "stock",
  "deal",
];

// Acciones disponibles para los detalles de cada módulo
const detailActions = [
  "edit",
  "delete",
  "send-reminder",
  "save-changes",
  "delete-document",
  "upload-document",
];

// Genera las rutas para un módulo
function generateModuleRoutes(module: string): string[] {
  const routes = [
    `/${module}`,
    `/${module}/details`,
    `/${module}/details/:id`,
  ];
  
  // Agrega las rutas de acciones
  detailActions.forEach((action) => {
    routes.push(`/${module}/details/:id/${action}`);
  });
  
  return routes;
}

// Genera todas las rutas protegidas
const protectedRoutes = [
  ...baseRoutes,
  ...modules.flatMap(generateModuleRoutes),
];

function checkIsProtectedRoute(path: string): boolean {
  // Verifica coincidencia exacta primero
  if (protectedRoutes.includes(path)) {
    return true;
  }
  
  // Verifica patrones dinámicos (rutas con :id)
  return protectedRoutes.some((route) => {
    // Convierte el patrón de ruta a expresión regular
    // Reemplaza :id con un patrón que coincida con cualquier ID
    const pattern = route.replace(/:id/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
}

export async function proxy(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;

  const isProtectedRoute = checkIsProtectedRoute(currentPath);

  if (!isProtectedRoute) return NextResponse.next();

  try {

    const cookieStore = await cookies();
    const jwt = cookieStore.get('jwt')?.value;

    if (!jwt) return NextResponse.redirect(new URL('/signin', request.url));
    
    let response;
    try {
      response = await fetch(`${STRAPI_BASE_URL}/api/users/me`, { 
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        // Agregar timeout y opciones de conexión
        signal: AbortSignal.timeout(10000), // 10 segundos de timeout
      });
    } catch (fetchError) {
      console.error('Error conectando a Strapi:', {
        error: fetchError,
        url: `${STRAPI_BASE_URL}/api/users/me`,
        message: fetchError instanceof Error ? fetchError.message : 'Error desconocido',
      });
      
      // Si es un error de conexión, verificar si Strapi está corriendo
      if (fetchError instanceof Error && (fetchError.message.includes('ECONNREFUSED') || fetchError.message.includes('fetch failed'))) {
        console.error('⚠️  Strapi no está disponible. Asegúrate de que el servidor esté corriendo en', STRAPI_BASE_URL);
        // Permitir continuar si es una ruta que no requiere autenticación estricta
        // o redirigir a una página de error
        return NextResponse.redirect(new URL('/signin?error=server_unavailable', request.url));
      }
      throw fetchError;
    }

    if (!response.ok) {
      console.warn('Respuesta no OK de Strapi:', response.status, response.statusText);
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    const userResponese = await response.json();
    console.log('userResponese', userResponese);
    if (!userResponese) return NextResponse.redirect(new URL('/signin', request.url));
    
    // if (!userResponese?.data?.isActive) return NextResponse.redirect(new URL('/signin', request.url));

    console.log('all is ok, continue to the requested page');
    return NextResponse.next();

    
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL('/signin', request.url));
  }

}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/dashboard',
    '/dashboard/:path*',
    '/dashboard_user',
    '/dashboard_user/:path*',
  ],
};

