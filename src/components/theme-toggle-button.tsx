"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    // Render a placeholder or nothing on the server to avoid hydration mismatch
    return <Button variant="ghost" size="icon" disabled className="h-8 w-8" />;
  }

  const isDark = theme === "dark";

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
      {isDark ? (
        <Sun />
      ) : (
        <Moon />
      )}
      <span className="sr-only">{isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}</span>
    </Button>
  );
}
