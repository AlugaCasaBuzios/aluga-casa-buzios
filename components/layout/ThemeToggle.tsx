"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aluga-casa-buzios:theme";
const THEME_CHANGED_EVENT = "aluga-casa-buzios:theme-changed";

type ThemePreference = "system" | "light" | "dark";

type ThemeToggleProps = {
  fullWidth?: boolean;
};

function readPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }

  return "system";
}

function applyImmediately(preference: ThemePreference) {
  const root = document.documentElement;
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", dark);
  root.dataset.theme = preference;
}

export default function ThemeToggle({ fullWidth = false }: ThemeToggleProps) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    function syncPreference() {
      setPreference(readPreference());
    }

    syncPreference();
    window.addEventListener(THEME_CHANGED_EVENT, syncPreference);
    window.addEventListener("storage", syncPreference);

    return () => {
      window.removeEventListener(THEME_CHANGED_EVENT, syncPreference);
      window.removeEventListener("storage", syncPreference);
    };
  }, []);

  function changeTheme(next: ThemePreference) {
    setPreference(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyImmediately(next);
    window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
  }

  return (
    <label
      className={`flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 shadow-sm transition ${
        fullWidth ? "w-full justify-between" : ""
      }`}
    >
      <span aria-hidden="true" className="text-base">
        {preference === "dark" ? "🌙" : preference === "light" ? "☀️" : "◐"}
      </span>

      <span className="sr-only">Tema do site</span>

      <select
        aria-label="Tema do site"
        value={preference}
        onChange={(event) => changeTheme(event.target.value as ThemePreference)}
        className={`cursor-pointer border-0 bg-transparent p-0 text-sm font-bold text-blue-950 outline-none ${
          fullWidth ? "min-w-0 flex-1" : "w-[88px]"
        }`}
      >
        <option value="system">Auto</option>
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
      </select>
    </label>
  );
}
