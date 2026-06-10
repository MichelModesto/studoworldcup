export function Card({
  titulo,
  children,
  className = "",
}: {
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass p-5 md:p-6 ${className}`}>
      {titulo && (
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {titulo}
        </h2>
      )}
      {children}
    </div>
  );
}
