"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle(
      "dark",
      saved ? saved === "dark" : prefersDark
    );
  }, []);

  return null;
}
