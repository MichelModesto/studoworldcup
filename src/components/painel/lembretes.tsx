"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

/** Registra o service worker (PWA) assim que o painel abre. */
export function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

function base64ParaUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Estado = "carregando" | "indisponivel" | "inativo" | "ativo";

/** Botão "ativar lembretes": push diário com os jogos do dia sem palpite. */
export function AtivarLembretes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      if (!chave || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("indisponivel");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (!reg) return setEstado("indisponivel");
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? "ativo" : "inativo");
    })();
  }, [chave]);

  if (estado === "indisponivel") return null;

  const alternar = async () => {
    const reg = await navigator.serviceWorker.ready;
    if (estado === "ativo") {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setEstado("inativo");
      return;
    }
    setEstado("carregando");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado("inativo");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8(chave!) as BufferSource,
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setEstado(r.ok ? "ativo" : "inativo");
    } catch {
      setEstado("inativo");
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={estado === "carregando"}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
        estado === "ativo"
          ? "border-brand/40 bg-brand/10 text-brand hover:bg-brand/20"
          : "border-border bg-surface/60 text-muted hover:border-brand/40 hover:text-foreground"
      }`}
      title="Receba um aviso de manhã quando tiver jogo do dia sem palpite"
    >
      {estado === "carregando" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : estado === "ativo" ? (
        <BellRing className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {estado === "ativo" ? "Lembretes ativados" : "Ativar lembretes"}
      {estado === "ativo" && <BellOff className="hidden h-3.5 w-3.5 opacity-60 sm:block" />}
    </button>
  );
}
