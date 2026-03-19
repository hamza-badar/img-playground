import { useEffect, useState } from "react";

const STORAGE_KEY = "image-playground-theme";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled = savedTheme ? savedTheme === "dark" : prefersDark;
    setIsDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return {
    isDark,
    toggleDarkMode: () => setIsDark((current) => !current),
  };
}
