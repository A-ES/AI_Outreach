"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Application, ApplicationStatus } from "@/lib/types";
import { KanbanCard } from "@/components/applications/KanbanCard";

interface KanbanColumnProps {
  status: ApplicationStatus;
  title: string;
  applications: Application[];
  onEdit: (app: Application) => void;
}

export function KanbanColumn({
  status,
  title,
  applications,
  onEdit,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-60 shrink-0 flex-col rounded-card border bg-panel-subtle md:w-64 ${
        isOver ? "border-accent ring-2 ring-accent-soft" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="caption rounded-full bg-surface px-2 py-0.5">
          {applications.length}
        </span>
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
        {applications.map((app) => (
          <KanbanCard key={app.id} application={app} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
