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
      className={`flex w-64 shrink-0 flex-col rounded-xl border bg-slate-50 ${
        isOver ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        <span className="caption rounded-full bg-white px-2 py-0.5">
          {applications.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
        {applications.map((app) => (
          <KanbanCard key={app.id} application={app} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
