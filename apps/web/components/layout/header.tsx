"use client";

import { useSession } from "@/lib/auth-client";
import { Bell, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-card/50 px-6 backdrop-blur-xl">
      <div>
        <h1 className="text-lg font-semibold">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your Instagram automation
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-[10px] font-bold text-white">
            3
          </span>
        </Button>
        
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <div className="ml-2 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background text-sm font-medium">
              {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
