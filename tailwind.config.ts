import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        muted: "var(--muted)",
        border: "var(--border)",
        panel: {
          DEFAULT: "var(--panel)",
          subtle: "var(--panel-subtle)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
      },
      borderRadius: {
        card: "0.5rem",
        control: "0.5rem",
      },
      spacing: {
        shell: "2rem",
        "shell-sm": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
