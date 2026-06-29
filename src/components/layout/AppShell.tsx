import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-shell-sm py-6 md:px-shell md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
