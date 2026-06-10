export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1.5 text-sm text-muted">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
