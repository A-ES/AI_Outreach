"use client";

import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = saved ? saved === "dark" : prefersDark;
    setDark(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-secondary w-full justify-between"
      aria-pressed={dark}
    >
      <span>Dark mode</span>
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          dark ? "bg-accent" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            dark ? "left-4" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
