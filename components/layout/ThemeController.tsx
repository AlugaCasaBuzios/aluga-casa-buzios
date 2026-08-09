"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const STORAGE_KEY = "aluga-casa-buzios:theme";
const THEME_CHANGED_EVENT = "aluga-casa-buzios:theme-changed";

type ThemePreference = "light" | "dark" | "system";

function readPreference(): ThemePreference {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }

  return "system";
}

function isPrivateArea(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/equipe");
}

export default function ThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      if (isPrivateArea(pathname)) {
        root.classList.remove("dark");
        root.dataset.theme = "light";
        return;
      }

      const preference = readPreference();
      const dark = preference === "dark" || (preference === "system" && media.matches);

      root.classList.toggle("dark", dark);
      root.dataset.theme = preference;
    }

    applyTheme();

    media.addEventListener("change", applyTheme);
    window.addEventListener(THEME_CHANGED_EVENT, applyTheme);
    window.addEventListener("storage", applyTheme);

    return () => {
      media.removeEventListener("change", applyTheme);
      window.removeEventListener(THEME_CHANGED_EVENT, applyTheme);
      window.removeEventListener("storage", applyTheme);
    };
  }, [pathname]);

  return null;
}
