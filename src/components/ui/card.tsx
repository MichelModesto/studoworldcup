export function Card({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo?: string;
  /** Conteúdo opcional alinhado à direita do título (ex.: selo "ao vivo"). */
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass p-5 md:p-6 ${className}`}>
      {(titulo || acao) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{titulo}</h2>
          )}
          {acao}
        </div>
      )}
      {children}
    </div>
  );
}
