import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Proxy (antigo "middleware" no Next.js 16).
 * Protege as rotas do painel: sem sessão -> redireciona para /login.
 * Já logado e tentando acessar /login -> manda para /painel.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const temSessao = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const rotaProtegida = pathname.startsWith("/painel");

  if (rotaProtegida && !temSessao) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && temSessao) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/login"],
};
