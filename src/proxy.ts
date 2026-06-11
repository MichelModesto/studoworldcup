import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth";

/**
 * Proxy (antigo "middleware" no Next.js 16; roda em Node.js).
 * Protege as rotas do painel validando a ASSINATURA do cookie — cookie
 * antigo/adulterado é apagado e tratado como deslogado, evitando loop de
 * redirecionamento entre /login e /painel.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const temSessao = Boolean(raw && decodeSession(raw));
  const cookieInvalido = Boolean(raw) && !temSessao;

  const rotaProtegida = pathname.startsWith("/painel");

  let res: NextResponse;
  if (rotaProtegida && !temSessao) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    res = NextResponse.redirect(url);
  } else if (pathname === "/login" && temSessao) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    res = NextResponse.redirect(url);
  } else {
    res = NextResponse.next();
  }

  if (cookieInvalido) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/painel/:path*", "/login"],
};
