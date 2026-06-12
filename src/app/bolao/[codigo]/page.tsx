import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import { entrarNoGrupo, normalizarCodigo } from "@/lib/bolao";

/**
 * Link de convite compartilhável: /bolao/K7M2QX
 * Logado -> entra no grupo e cai no ranking. Deslogado -> login/cadastro
 * com retorno automático para cá (aí entra no grupo).
 */
export default async function ConvitePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const cod = normalizarCodigo(codigo);
  if (!temBanco()) redirect("/painel/bolao");

  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0) redirect(`/login?next=/bolao/${cod}`);

  const r = await entrarNoGrupo(sessao.uid, cod);
  if ("erro" in r) redirect("/painel/bolao");
  redirect(`/painel/bolao/grupo/${r.codigo}`);
}
