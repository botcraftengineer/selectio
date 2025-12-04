import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Публичные маршруты
  const publicPaths = ["/auth", "/api"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Если нет сессии и пытается зайти на защищенный маршрут
  if (!sessionCookie && !isPublicPath) {
    const signInUrl = new URL("/auth/signin", request.url);
    // Сохраняем redirect только для не-корневых путей
    if (pathname !== "/") {
      signInUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  // Если есть сессия и пытается зайти на /auth/*
  if (sessionCookie && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
