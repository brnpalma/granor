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
    return (
        <Button variant="ghost" size="icon" disabled className="w-full justify-start gap-2">
            <div className="h-4 w-4 bg-muted-foreground/20 rounded-full animate-pulse" />
            <span className="h-4 w-20 bg-muted-foreground/20 rounded-md animate-pulse"></span>
        </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-full justify-start gap-2">
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span>{isDark ? "Tema Claro" : "Tema Escuro"}</span>
    </Button>
  );
}