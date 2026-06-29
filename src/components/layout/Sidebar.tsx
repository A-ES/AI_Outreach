"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DarkModeToggle } from "@/components/layout/DarkModeToggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/resumes", label: "Resumes" },
  { href: "/resume-tailor", label: "Resume Tailor" },
  { href: "/resume-match", label: "Resume Match" },
  { href: "/outreach", label: "Outreach" },
  { href: "/analytics", label: "Analytics" },
  { href: "/ai-evaluation", label: "AI Evaluation" },
  { href: "/contacts", label: "Contacts" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface md:w-64">
      <div className="border-b border-border px-5 py-5 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Job Search
        </p>
        <h1 className="mt-1 text-lg font-semibold text-foreground">
          Command Center
        </h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-panel-subtle hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <DarkModeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="btn-secondary w-full"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
