"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => {
      try {
        if (localStorage.getItem("sirid-theme")) return;
      } catch {
        return;
      }
      const next = preference.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };
    preference.addEventListener("change", followSystem);
    return () => preference.removeEventListener("change", followSystem);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("sirid-theme", next);
    } catch {
      // The choice still works for this page when browser storage is disabled.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-charcoal/20 text-charcoal transition-colors duration-fast hover:bg-sand focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
