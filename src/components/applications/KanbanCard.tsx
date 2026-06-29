"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Application } from "@/lib/types";

interface KanbanCardProps {
  application: Application;
  onEdit: (app: Application) => void;
  isOverlay?: boolean;
}

export function KanbanCard({ application, onEdit, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: application.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
        isDragging || isOverlay ? "opacity-90 shadow-md ring-2 ring-indigo-200" : ""
      }`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <p className="text-sm font-medium text-slate-900">
          {application.company_name}
        </p>
        <p className="caption mt-0.5">{application.role_title}</p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(application)}
        className="caption mt-2 font-medium text-indigo-700 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}
