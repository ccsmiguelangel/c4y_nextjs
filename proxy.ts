import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STRAPI_BASE_URL } from "./lib/config";

const protectedRoutes = [
  "/dashboard",
  "/dashboard_user",
];

function checkIsProtectedRoute(path: string) {
  return protectedRoutes.includes(path);
}

export async function proxy(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;

  const isProtectedRoute = checkIsProtectedRoute(currentPath);

  if (!isProtectedRoute) return NextResponse.next();

  try {

    const cookieStore = await cookies();
    const jwt = cookieStore.get('jwt')?.value;

    if (!jwt) return NextResponse.redirect(new URL('/signin', request.url));
    const response = await fetch(`${STRAPI_BASE_URL}/api/users/me`, { 
      headers: { 
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      } 
    });

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

