"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "trading-dashboard-theme";

function applyTheme(theme: "dark" | "light") {
  const html = document.documentElement;
  if (theme === "light") {
    html.classList.add("light");
  } else {
    html.classList.remove("light");
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved === "light" ? "light" : "dark";
    setTheme(initial);
    applyTheme(initial);
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  if (!hydrated) {
    return <div className="w-16 h-8" />; // placeholder, hindari layout shift
  }

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
      className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors"
      style={{
        backgroundColor: "var(--bg-card-secondary)",
        borderColor: "var(--border-card-strong)",
        color: "var(--text-secondary)",
      }}
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
