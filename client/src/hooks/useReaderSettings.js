import { useState } from "react";

const KEY = "novella_reader";


export const FONT_SIZES = ["text-base", "text-lg", "text-xl", "text-2xl"];

const DEFAULTS = { size: 1, theme: "light" };

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return {
      size: Number.isInteger(saved?.size) && saved.size >= 0 && saved.size < FONT_SIZES.length
        ? saved.size
        : DEFAULTS.size,
      theme: saved?.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return DEFAULTS; 
  }
};

export default function useReaderSettings() {
  const [settings, setSettings] = useState(load);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      
    }
  };

  return {
    size: settings.size,
    theme: settings.theme,
    canShrink: settings.size > 0,
    canGrow: settings.size < FONT_SIZES.length - 1,
    smaller: () => update({ size: Math.max(settings.size - 1, 0) }),
    larger: () => update({ size: Math.min(settings.size + 1, FONT_SIZES.length - 1) }),
    toggleTheme: () => update({ theme: settings.theme === "dark" ? "light" : "dark" }),
  };
}