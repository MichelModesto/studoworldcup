"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { temBanco } from "@/lib/db";
import {
  criarGrupo,
  entrarNoGrupo,
  normalizarCodigo,
  salvarBonus,
  salvarPalpite,
  salvarPix,
} from "@/lib/bolao";

export type BolaoState = { error?: string; ok?: string };

export async function gerarCodigoRecuperacaoAction(): Promise<BolaoState> {
  const auth = await exigirUsuario();
  if ("error" in auth) return { error: auth.error };
  const { novoCodigoRecuperacao } = await import("@/lib/auth");
  const codigo = await novoCodigoRecuperacao(auth.uid);
  return { ok: codigo };
}

async function exigirUsuario(): Promise<{ uid: number } | { error: string }> {
  if (!temBanco()) return { error: "Banco de dados ainda não configurado (veja o README)." };
  const s = await getSession();
  if (!s || s.uid <= 0) return { error: "Crie sua conta para participar do bolão." };
  return { uid: s.uid };
}

export async function criarGrupoAction(_prev: BolaoState, formData: FormData): Promise<BolaoState> {
  const auth = await exigirUsuario();
  if ("error" in auth) return { error: auth.error };
  const r = await criarGrupo(auth.uid, String(formData.get("nome") ?? ""));
  if ("erro" in r) return { error: r.erro };
  redirect(`/painel/bolao/grupo/${r.codigo}`);
}

export async function entrarGrupoAction(_prev: BolaoState, formData: FormData): Promise<BolaoState> {
  const auth = await exigirUsuario();
  if ("error" in auth) return { error: auth.error };
  const r = await entrarNoGrupo(auth.uid, String(formData.get("codigo") ?? ""));
  if ("erro" in r) return { error: r.erro };
  redirect(`/painel/bolao/grupo/${normalizarCodigo(r.codigo)}`);
}

/**
 * Salva todos os palpites editáveis enviados pelo formulário.
 * Campos: m-<matchId> e v-<matchId> (gols do mandante/visitante).
 */
export async function salvarPalpitesAction(
  _prev: BolaoState,
  formData: FormData,
): Promise<BolaoState> {
  const auth = await exigirUsuario();
  if ("error" in auth) return { error: auth.error };

  let salvos = 0;
  const erros: string[] = [];
  const ids = new Set<number>();
  for (const key of formData.keys()) {
    const m = /^m-(\d+)$/.exec(key);
    if (m) ids.add(Number(m[1]));
  }
  for (const id of ids) {
    const gm = String(formData.get(`m-${id}`) ?? "").trim();
    const gv = String(formData.get(`v-${id}`) ?? "").trim();
    if (gm === "" && gv === "") continue; // sem palpite para este jogo
    if (gm === "" || gv === "") {
      erros.push(`Jogo ${id}: preencha os dois lados do placar.`);
      continue;
    }
    const erro = await salvarPalpite(auth.uid, id, Number(gm), Number(gv));
    if (erro) erros.push(erro);
    else salvos++;
  }

  revalidatePath("/painel/bolao/palpites");
  if (erros.length) {
    return {
      error: erros.slice(0, 3).join(" "),
      ok: salvos ? `${salvos} palpite(s) salvos.` : undefined,
    };
  }
  if (!salvos) return { error: "Nenhum palpite para salvar — preencha algum placar." };
  return { ok: `${salvos} palpite(s) salvos. Boa sorte! 🍀` };
}

export async function salvarPixAction(_prev: BolaoState, formData: FormData): Promise<BolaoState> {
  const auth = await exigirUsuario();
  if ("error" in auth) return { error: auth.error };
  const grupoId = Number(formData.get("grupoId"));
  const pix = String(formData.get("pix") ?? "");
  if (!Number.isInteger(grupoId)) return { error: "Grupo inválido." };
  const erro = await salvarPix(auth.uid, grupoId, pix);
  if (erro) return { error: erro };
  revalidatePath("/painel/bolao");
  return { ok: pix.trim() ? "PIX de entrada salvo! 💰" : "PIX removido." };
}

export async function salvarBonusAction(
  _prev: BolaoState,
  formData: FormData,
): Promise<BolaoState> {
  const auth = await exigirUsuario();
  if ("error" in auth) return { error: auth.error };
  const erro = await salvarBonus(
    auth.uid,
    String(formData.get("campeao") ?? ""),
    String(formData.get("artilheiro") ?? ""),
  );
  if (erro) return { error: erro };
  revalidatePath("/painel/bolao/palpites");
  return { ok: "Palpites bônus salvos! 🏆" };
}
