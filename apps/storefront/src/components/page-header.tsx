export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="shrink-0 pb-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {sub ? <p className="pt-1 text-sm text-subtle">{sub}</p> : null}
    </div>
  );
}
