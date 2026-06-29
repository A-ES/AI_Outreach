interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-accent">
        <span className="h-2 w-2 rounded-full bg-accent" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
