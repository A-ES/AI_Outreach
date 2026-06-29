"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { Application, ApplicationStatus } from "@/lib/types";
import { KANBAN_COLUMNS, STATUS_LABELS } from "@/lib/types";
import { KanbanColumn } from "@/components/applications/KanbanColumn";
import { KanbanCard } from "@/components/applications/KanbanCard";

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<void>;
  onEdit: (app: Application) => void;
}

export function KanbanBoard({
  applications,
  onStatusChange,
  onEdit,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeApp = applications.find((a) => a.id === activeId);

  function appsForStatus(status: ApplicationStatus) {
    return applications.filter((a) => a.status === status);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const appId = String(active.id);
    const newStatus = String(over.id) as ApplicationStatus;

    if (!KANBAN_COLUMNS.includes(newStatus)) return;

    const app = applications.find((a) => a.id === appId);
    if (!app || app.status === newStatus) return;

    try {
      setError(null);
      await onStatusChange(appId, newStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              title={STATUS_LABELS[status]}
              applications={appsForStatus(status)}
              onEdit={onEdit}
            />
          ))}
        </div>
        <DragOverlay>
          {activeApp ? (
            <KanbanCard application={activeApp} onEdit={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
